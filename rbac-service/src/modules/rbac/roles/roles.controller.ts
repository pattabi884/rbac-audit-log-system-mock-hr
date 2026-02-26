// src/modules/rbac/roles/roles.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';

import { RolesService } from './roles.service';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RequirePermissions } from '@modules/auth/decorators/require-permissions.decorator';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AddPermissionDto } from './dto/add-permission.dto';
import { Public } from '@modules/auth/decorators/public.decorator';

@Controller('roles')
@UseGuards(JwtAuthGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}
  
  @Post()
  @RequirePermissions('roles:create')
  create(@Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.create(createRoleDto);
  }

  // Temporarily public for bootstrap
  @Public()
  @Get()
  findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @RequirePermissions('roles:read')
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('roles:update')
  update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    return this.rolesService.update(id, updateRoleDto);
  }

  @Post(':id/permissions')
  @RequirePermissions('roles:update')
  addPermission(@Param('id') id: string, @Body() dto: AddPermissionDto) {
    return this.rolesService.addPermission(id, dto.permission);
  }

  @Delete(':id/permissions/:permission')
  @RequirePermissions('roles:update')
  removePermission(
    @Param('id') id: string,
    @Param('permission') permission: string,
  ) {
    return this.rolesService.removePermission(id, permission);
  }

  @Delete(':id')
  @RequirePermissions('roles:delete')
  remove(@Param('id') id: string) {
    return this.rolesService.remove(id);
  }
}