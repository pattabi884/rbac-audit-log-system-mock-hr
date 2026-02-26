import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose'
import { UserRole } from '@infrastructure/database/schemas/user-role.schema';
import { Role } from '@infrastructure/database/schemas/role.schema';
import { constrainedMemory } from 'process';
import { RbacCacheService } from 'src/infrastructure/cache/rbac-cache.service';

@Injectable()
export class UserRolesService {
    constructor(
        @InjectModel(UserRole.name) private userRoleModel: Model<UserRole>,
        @InjectModel(Role.name) private roleModel: Model<Role>,
        private rbacCacheService: RbacCacheService,
    ){}
    //assign role to use
    async assignRole(userId: string, roleId: string, assignedBy: string): Promise<UserRole>{
        //check if role exists 
        const role = await this.roleModel.findById(roleId);
        if(!role){
            throw new NotFoundException(`Role with ID '${roleId}' not found`);
        }
        //check if assignment alrey exists
        const existing = await this.userRoleModel.findOne({ userId, roleId})
        if (existing){
            return existing;//already assigned
        }
        //create assignment
        const userRole = new this.userRoleModel({
            userId,
            roleId,
            assignedAt: new Date(),
            assignedBy,
        });
        return userRole.save()
    }

    // remove role from user
   async removeRole(userId: string, roleId: string): Promise<void> {
    const result = await this.userRoleModel.deleteOne({ userId, roleId });
    
    if (result.deletedCount === 0) {
      throw new NotFoundException('Role assignment not found');
    }
  }
  //get all roles for the user 

  async getUserRoles(userId: string): Promise<Role[]>{
    const userRoles = await this.userRoleModel
    .find({ userId })
    .populate('roleId')
    .exec()

    return userRoles.map(ur => ur.roleId as any)
  }

  //get all the permissioons fro a user
async getUserPermissions(userId: string): Promise<string[]> {

  // 1️⃣ Check cache first
  const cached = await this.rbacCacheService.getUserPermissions(userId);
  if (cached) {
    return cached;
  }

  // 2️⃣ Fetch from DB if cache miss
  const roles = await this.getUserRoles(userId);

  // Flatten permissions
  const permissions = new Set<string>();
  for (const role of roles) {
    if (role && role.permissions) {
      role.permissions.forEach(p => permissions.add(p));
    }
  }

  const permissionsArray = Array.from(permissions);

  // 3️⃣ Store in cache
  await this.rbacCacheService.setUserPermissions(userId, permissionsArray);

  return permissionsArray;
}


//check if user has specific permission

async hasPermission(userId: string, requiredPermission: string): Promise<boolean>{
    const permissions = await this.getUserPermissions(userId);

    //direct match
    if ( permissions.includes(requiredPermission)){
        return true;
    }
    //wild card permisssions
    const [resource, action] = requiredPermission.split(':');
    if(permissions.includes(`${resource}:*`)){
        return true;
    }
    //check *:*(super admin)
    if (permissions.includes('*:*')){
        return true;
    }
    return false
}
//get all users with specific role
async getUsersWithRole(roleId: string): Promise<string[]>{
    const userRoles = await this.userRoleModel.find({ roleId }).exec();
    return userRoles.map(ur => ur.userId.toString());
}
}