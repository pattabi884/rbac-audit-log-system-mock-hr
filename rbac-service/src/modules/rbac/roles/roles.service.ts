// src/modules/rbac/roles/roles.service.ts

import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role, RoleDocument } from '@infrastructure/database/schemas/role.schema';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RbacCacheService } from '@infrastructure/cache/rbac-cache.service';



@Injectable()
export class RolesService {
  constructor(
    @InjectModel(Role.name)
    private roleModel: Model<RoleDocument>,

    // NEW: inject so we can invalidate user permission caches when a role changes
    private rbacCacheService: RbacCacheService,
  ) {}

  async create(createRoleDto: CreateRoleDto): Promise<RoleDocument> {
    const existingRole = await this.roleModel.findOne({
      name: createRoleDto.name,
    });
    if (existingRole) {
      throw new ConflictException(`Role '${createRoleDto.name}' already exists`);
    }

    const role = new this.roleModel({
      ...createRoleDto,
      isSystemRole: false, // always force false — never trust client input on this
    });

    return role.save();
  }

  async findAll(): Promise<RoleDocument[]> {
    return this.roleModel.find({ isActive: true }).exec();
  }

  async findOne(id: string): Promise<RoleDocument> {
    const role = await this.roleModel.findById(id).exec();
    if (!role) {
      throw new NotFoundException(`Role with ID '${id}' not found`);
    }
    return role;
  }

  async update(id: string, updateRoleDto: UpdateRoleDto): Promise<RoleDocument> {
    const role = await this.findOne(id);
    if (role.isSystemRole) {
      throw new ConflictException('Cannot update system roles');
    }
    Object.assign(role, updateRoleDto);
    return role.save();
  }

  // ─── ADD PERMISSION ─────────────────────────────────────────────────────────
  //
  // Adds a permission string to a role's permissions array, then immediately
  // invalidates the permission cache for every user who holds that role.
  //
  // Why we check !includes() before pushing:
  //   We don't want "bonus:approve" appearing twice in the array.
  //   Duplicate entries would waste memory and add noise to audit logs.
  //
  async addPermission(roleId: string, permission: string): Promise<RoleDocument> {
    const role = await this.findOne(roleId);

    if (!role.permissions.includes(permission)) {
      role.permissions.push(permission);
      await role.save();

      // ── Cache invalidation ──────────────────────────────────────────────────
      //
      // invalidateRoleCache() reads the reverse index (role:{roleId}:users)
      // to find all users currently holding this role, then deletes each
      // user:{userId}:permissions key from Redis.
      //
      // Why Promise (fire-and-continue) vs await:
      //   We await because if the cache invalidation fails, we want to know.
      //   Silently failing here would leave users with stale permissions —
      //   the exact problem we're trying to prevent.
      //
      await this.rbacCacheService.invalidateRoleCache(roleId);
    }

    return role;
  }

  // ─── REMOVE PERMISSION ──────────────────────────────────────────────────────
  //
  // Removes a permission string from a role's permissions array, then
  // immediately invalidates cache for all users holding that role.
  //
  // This is a SECURITY-CRITICAL operation:
  //   If a user has 'bonus:approve' in their cache and you remove it from
  //   their role, they can keep approving bonuses until the 5-minute TTL
  //   expires — unless we invalidate here.
  //
  async removePermission(
    roleId: string,
    permission: string,
  ): Promise<RoleDocument> {
    const role = await this.findOne(roleId);
    role.permissions = role.permissions.filter((p) => p !== permission);
    await role.save();

    // Immediately revoke access for all users holding this role
    await this.rbacCacheService.invalidateRoleCache(roleId);

    return role;
  }

  async remove(id: string): Promise<void> {
    const role = await this.findOne(id);
    if (role.isSystemRole) {
      throw new ConflictException('Cannot delete system roles');
    }
    role.isActive = false;
    await role.save();
  }

  async getRolePermissions(roleId: string): Promise<string[]> {
    const role = await this.findOne(roleId);
    return role.permissions;
  }
}