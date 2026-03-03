import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserRole } from '@infrastructure/database/schemas/user-role.schema';
import { Role } from '@infrastructure/database/schemas/role.schema';
import { RbacCacheService } from 'src/infrastructure/cache/rbac-cache.service';
import { Types } from 'mongoose'; 
@Injectable()
export class UserRolesService {
  constructor(
    @InjectModel(UserRole.name) private readonly userRoleModel: Model<UserRole>,
    @InjectModel(Role.name) private readonly roleModel: Model<Role>,
    private readonly rbacCacheService: RbacCacheService,
  ) {}

  async assignRole(
    userId: string,
    roleId: string,
    assignedBy: string,
  ): Promise<UserRole> {
    const role = await this.roleModel.findById(roleId);
    if (!role) {
      throw new NotFoundException(`Role with ID '${roleId}' not found`);
    }

    // Idempotent check
    const existing = await this.userRoleModel.findOne({ userId, roleId });
    if (existing) {
      return existing;
    }

    // Create + save
    const userRole = new this.userRoleModel({
      userId,
      roleId,
      assignedAt: new Date(),
      assignedBy,
    });

    const saved = await userRole.save();

    // Clear user cache
    await this.rbacCacheService.invalidateUserCache(userId);

    // Register reverse index
    await this.rbacCacheService.addUserToRoleIndex(roleId, userId);

    return saved;
  }

  async removeRole(userId: string, roleId: string): Promise<void> {
    const result = await this.userRoleModel.deleteOne({ userId, roleId });

    if (result.deletedCount === 0) {
      throw new NotFoundException(
        `Role '${roleId}' not found for user '${userId}'`,
      );
    }

    await this.rbacCacheService.invalidateUserCache(userId);
    await this.rbacCacheService.removeUserFromRoleIndex(roleId, userId);
  }

async getUserRoles(userId: string): Promise<Role[]> {
  const userRoles = await this.userRoleModel
    .find({ userId: new Types.ObjectId(userId) }) // explicit cast, no auto-cast ambiguity
    .populate('roleId')
    .exec();
  return userRoles.map((ur) => ur.roleId as any);
}

  async getUserPermissions(userId: string): Promise<string[]> {
  const cached = await this.rbacCacheService.getUserPermissions(userId);
  if (cached !== null) {
    return cached;
  }
  const roles = await this.getUserRoles(userId);
  const permissions = new Set<string>();
  for (const role of roles) {
    if (role && role.permissions) {
      role.permissions.forEach(p => permissions.add(p));
    }
  }
  const permissionsArray = Array.from(permissions);
  await this.rbacCacheService.setUserPermissions(userId, permissionsArray);
  return permissionsArray;
}

  async hasPermission(
    userId: string,
    requiredPermission: string,
  ): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);

    // Direct matchP
    if (permissions.includes(requiredPermission)) {
      return true;
    }

    // Resource wildcard (e.g. user:*)
    const [resource] = requiredPermission.split(':');
    if (permissions.includes(`${resource}:*`)) {
      return true;
    }

    // Super admin wildcard
    if (permissions.includes('*:*')) {
      return true;
    }

    return false;
  }

  async getUsersWithRole(roleId: string): Promise<string[]> {
    const userRoles = await this.userRoleModel.find({ roleId }).exec();
    return userRoles.map((ur) => ur.userId.toString());
  }
}