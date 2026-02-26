import { Controller, Post, Delete, Get, Param, Body } from '@nestjs/common';
import { UserRolesService } from './user-roles.service';
//import { AssignRoleDto } from './dto';
import { Public } from '@modules/auth/decorators/public.decorator';
import { AssignRoleDto } from './dto/assign-role.dto';



@Controller('user-roles')
export class UserRolesController {
  constructor(private readonly userRolesService: UserRolesService) {}
 // @Public()
  @Post('assign')
  assignRole(@Body() dto: AssignRoleDto) {
    return this.userRolesService.assignRole(dto.userId, dto.roleId, dto.assignedBy);
  }

  @Delete(':userId/:roleId')
  removeRole(@Param('userId') userId: string, @Param('roleId') roleId: string) {
    return this.userRolesService.removeRole(userId, roleId);
  }

  @Get('user/:userId/roles')
  getUserRoles(@Param('userId') userId: string) {
    return this.userRolesService.getUserRoles(userId);
  }

  @Get('user/:userId/permissions')
  getUserPermissions(@Param('userId') userId: string) {
    return this.userRolesService.getUserPermissions(userId);
  }

  @Get('role/:roleId/users')
  getUsersWithRole(@Param('roleId') roleId: string) {
    return this.userRolesService.getUsersWithRole(roleId);
  }
}