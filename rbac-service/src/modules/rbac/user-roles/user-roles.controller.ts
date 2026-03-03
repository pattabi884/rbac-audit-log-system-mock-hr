// src/modules/rbac/user-roles/user-roles.controller.ts

import { Controller, Post, Delete, Get, Param, Body } from '@nestjs/common';
import { UserRolesService } from './user-roles.service';
import { AssignRoleDto } from './dto/assign-role.dto';
import { RequirePermissions } from '@modules/auth/decorators/require-permissions.decorator';

// ─── WHY THIS FILE CHANGED ──────────────────────────────────────────────────
//
// BEFORE this fix:
//   The assignRole endpoint had @Public() commented out, which meant it was
//   protected by JwtAuthGuard (needed a valid token) but had NO permission check.
//
//   That means: any logged-in user — including an Employee — could hit:
//     POST /user-roles/assign
//     body: { userId: "any-user", roleId: "admin-role-id", assignedBy: "me" }
//   ...and give themselves or anyone else any role in the system.
//
//   This is a privilege escalation vulnerability. An Employee could assign
//   themselves the Admin role and gain full system access.
//
// AFTER this fix:
//   @RequirePermissions('roles:assign') is added to assignRole().
//   The PermissionsGuard (which runs globally) will:
//     1. Read the metadata: required permission = 'roles:assign'
//     2. Call hasPermission(userId, 'roles:assign')
//     3. Only return true if the user's role includes 'roles:assign' in its
//        permissions array (which only the HRAdmin role has in our seed data)
//
//   An Employee or Manager calling this endpoint now gets 403 Forbidden.
//
// ─────────────────────────────────────────────────────────────────────────────

@Controller('user-roles')
export class UserRolesController {
  constructor(private readonly userRolesService: UserRolesService) {}

  // POST /user-roles/assign
  //
  // Protected by @RequirePermissions('roles:assign').
  // Only users whose role includes 'roles:assign' in its permissions can call this.
  // In our system that's only the HRAdmin role.
  //
  // Body (AssignRoleDto): { userId: string, roleId: string, assignedBy: string }
  //
  // What happens after this call (new production behavior):
  //   1. MongoDB: UserRole document created
  //   2. Redis: user's permission cache invalidated → stale data gone immediately
  //   3. Redis: userId added to role's reverse index → future role-permission
  //      changes will propagate to this user
  //
  @Post('assign')
  @RequirePermissions('roles:assign')
  assignRole(@Body() dto: AssignRoleDto) {
    return this.userRolesService.assignRole(
      dto.userId,
      dto.roleId,
      dto.assignedBy,
    );
  }

  // DELETE /user-roles/:userId/:roleId
  //
  // Requires the same 'roles:assign' permission — if you can assign roles
  // you can also remove them. Splitting these into separate permissions
  // (roles:assign vs roles:revoke) is a future enhancement if the business
  // needs more granularity.
  //
  @Delete(':userId/:roleId')
  @RequirePermissions('roles:assign')
  removeRole(
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
  ) {
    return this.userRolesService.removeRole(userId, roleId);
  }

  // GET /user-roles/user/:userId/roles
  //
  // Read-only — requires roles:read permission.
  // Returns all Role documents the user currently holds.
  //
  @Get('user/:userId/roles')
  @RequirePermissions('roles:read')
  getUserRoles(@Param('userId') userId: string) {
    return this.userRolesService.getUserRoles(userId);
  }

  // GET /user-roles/user/:userId/permissions
  //
  // Read-only — returns the flat flattened permission list for a user.
  // Useful for debugging and admin tooling.
  //
  @Get('user/:userId/permissions')
  @RequirePermissions('roles:read')
  getUserPermissions(@Param('userId') userId: string) {
    return this.userRolesService.getUserPermissions(userId);
  }

  // GET /user-roles/role/:roleId/users
  //
  // Returns all userIds currently holding a given role.
  //
  @Get('role/:roleId/users')
  @RequirePermissions('roles:read')
  getUsersWithRole(@Param('roleId') roleId: string) {
    return this.userRolesService.getUsersWithRole(roleId);
  }
}