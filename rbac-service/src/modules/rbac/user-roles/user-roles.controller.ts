// src/modules/rbac/user-roles/user-roles.controller.ts

import { Controller, Post, Delete, Get, Param, Body } from '@nestjs/common';
import { UserRolesService } from './user-roles.service';
import { AssignRoleDto } from './dto/assign-role.dto';
import { RequirePermissions } from '@modules/auth/decorators/require-permissions.decorator';
import { Public } from '@modules/auth/decorators/public.decorator';


@Controller('user-roles')
export class UserRolesController {
  constructor(private readonly userRolesService: UserRolesService) {}

  @Post('assign')
  @RequirePermissions('roles:assign')
  assignRole(@Body() dto: AssignRoleDto) {
    return this.userRolesService.assignRole(
      dto.userId,
      dto.roleId,
      dto.assignedBy,
    );
  }

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
  @Public()
  @Get('user/:userId/roles')
  @RequirePermissions('roles:read')
  getUserRoles(@Param('userId') userId: string) {
    return this.userRolesService.getUserRoles(userId);
  }

  // GET /user-roles/user/:userId/permissions
  //
  // Read-only — returns the flat flattened permission list for a user.
  // Useful for debugging and admin tooling.
  @Public()
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