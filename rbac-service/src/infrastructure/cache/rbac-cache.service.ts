// src/infrastructure/cache/rbac-cache.service.ts

import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

// ─── WHY THIS FILE EXISTS ────────────────────────────────────────────────────
//
// All Redis cache operations for the RBAC system live here.
// Having one service own all the cache keys means:
//   - No key typos scattered across the codebase (one source of truth)
//   - Easy to find every place that touches the cache
//   - Easy to swap Redis for something else without touching business logic
//
// BEFORE this fix:
//   - invalidateRoleCache() was completely empty (just a comment saying "implement later")
//   - There was no way to know WHICH users held a given role
//   - When a role's permissions changed, cached stale data lived for 5 full minutes
//
// AFTER this fix:
//   - A "reverse index" tracks which users hold each role
//   - When permissions on a role change, we can find every holder and clear their cache
//   - Role assignment and removal stay perfectly in sync with the cache
//
// ─── THE REVERSE INDEX CONCEPT ───────────────────────────────────────────────
//
// The UserRole collection in MongoDB tells us: "user X has role Y"
// But to answer "who currently holds role Y?" we'd need a DB query.
// We cache that answer separately:
//
//   Redis key:  role:{roleId}:users
//   Redis value: JSON array of userIds  e.g. ["user123", "user456"]
//
// We maintain this in Redis alongside the permission cache.
// When a role's permissions change, we read that array and invalidate
// each user's permission cache. Two cache reads + N deletes, zero DB hits.
//
// ─── CACHE KEY LAYOUT ────────────────────────────────────────────────────────
//
//   user:{userId}:permissions   →  string[]   (the user's flat permission list)
//   role:{roleId}:users         →  string[]   (userIds holding that role)
//
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class RbacCacheService {

  // TTL = 300 seconds (5 minutes).
  // This is the window during which a permission change might not be reflected
  // IF the role's user index is somehow out of sync.
  // With the reverse index maintained correctly, changes propagate immediately.
  private readonly TTL = 300;

  constructor(
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  // ─── USER PERMISSION CACHE ──────────────────────────────────────────────────
  //
  // getUserPermissions: called at the START of hasPermission() in user-roles.service.ts
  // Returns the flat permission array if cached, null if cache miss.
  // A null return means: go to the DB and call setUserPermissions() after.
  //
  async getUserPermissions(userId: string): Promise<string[] | null> {
    const key = `user:${userId}:permissions`;
    return (await this.cacheManager.get<string[]>(key)) ?? null;
  }

  // setUserPermissions: called AFTER a DB fetch so next request is a cache hit.
  //
  async setUserPermissions(userId: string, permissions: string[]): Promise<void> {
    const key = `user:${userId}:permissions`;
    await this.cacheManager.set(key, permissions, this.TTL);
  }

  // invalidateUserCache: delete the user's cached permission list.
  //
  // When to call this:
  //   - After assigning a NEW role to a user (they now have more permissions)
  //   - After removing a role from a user (they now have fewer permissions)
  //   - After suspending / deactivating a user
  //
  // Without this call, the user continues to see their OLD permissions
  // from cache until the 5-minute TTL expires. That's a real security gap.
  //
  async invalidateUserCache(userId: string): Promise<void> {
    const key = `user:${userId}:permissions`;
    await this.cacheManager.del(key);
  }

  // ─── ROLE → USER REVERSE INDEX ──────────────────────────────────────────────
  //
  // getRoleUsers: returns the list of userIds currently holding a given role.
  // Used by invalidateRoleCache() to know whose permission cache to clear.
  //
  private async getRoleUsers(roleId: string): Promise<string[]> {
    const key = `role:${roleId}:users`;
    return (await this.cacheManager.get<string[]>(key)) ?? [];
  }

  // addUserToRoleIndex: called in user-roles.service.ts when a role is ASSIGNED.
  //
  // When user A is given role R:
  //   1. We read the current array at role:{R}:users
  //   2. We add user A's ID (if not already there)
  //   3. We write the updated array back
  //
  // Why: so that when role R's permissions change later, we can find user A
  // and invalidate their cache.
  //
  async addUserToRoleIndex(roleId: string, userId: string): Promise<void> {
    const key = `role:${roleId}:users`;
    const existing = await this.getRoleUsers(roleId);

    // Only add if not already present — avoid duplicates
    if (!existing.includes(userId)) {
      existing.push(userId);
      // No TTL here — the role-user index should survive as long as the
      // assignment exists. We explicitly clean it up in removeUserFromRoleIndex.
      await this.cacheManager.set(key, existing, 0);
    }
  }

  // removeUserFromRoleIndex: called in user-roles.service.ts when a role is REMOVED.
  //
  // When user A loses role R:
  //   1. Read the current array at role:{R}:users
  //   2. Filter out user A's ID
  //   3. Write the updated array back
  //
  async removeUserFromRoleIndex(roleId: string, userId: string): Promise<void> {
    const key = `role:${roleId}:users`;
    const existing = await this.getRoleUsers(roleId);
    const updated = existing.filter((id) => id !== userId);
    await this.cacheManager.set(key, updated, 0);
  }

  // ─── ROLE CACHE INVALIDATION ─────────────────────────────────────────────────
  //
  // invalidateRoleCache: called when a ROLE's permissions change.
  //
  // This is the function that was completely empty before.
  // The old comment said "more complex, need to find all users with this role".
  // Now we have the reverse index to do exactly that.
  //
  // When to call this:
  //   - After roles.service.addPermission(roleId, permission)
  //   - After roles.service.removePermission(roleId, permission)
  //
  // What it does:
  //   1. Reads role:{roleId}:users from cache → gives us the list of affected users
  //   2. For each user, deletes user:{userId}:permissions from cache
  //   3. Next time any of those users make a request, getUserPermissions() returns null
  //      → DB is queried → fresh permissions are fetched and re-cached
  //
  // This is correct and safe. We never "push" new data into user caches —
  // we just invalidate them and let the normal flow repopulate lazily.
  //
  async invalidateRoleCache(roleId: string): Promise<void> {
    const usersWithRole = await this.getRoleUsers(roleId);

    // If nobody holds this role yet (e.g. role just created), nothing to do
    if (usersWithRole.length === 0) {
      return;
    }

    // Invalidate all affected users in parallel using Promise.all.
    // Sequential invalidation (a for loop) would be slower — each del()
    // is a Redis round trip. Parallel is both faster and correct here
    // because each operation targets a different key.
    await Promise.all(
      usersWithRole.map((userId) => this.invalidateUserCache(userId)),
    );
  }
}