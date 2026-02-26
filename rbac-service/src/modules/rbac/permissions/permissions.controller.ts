import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import { Public } from '@modules/auth/decorators/public.decorator';
import { PermissionsService } from './permissions.service';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
// PermissionsGuard removed from import — it's now a global APP_GUARD in AppModule
// and runs automatically on every route. Listing it here caused NestJS to try
// to instantiate it inside PermissionsModule, where its dependencies don't exist.
import { RequirePermissions } from '@modules/auth/decorators/require-permissions.decorator';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
@Controller('permissions')
@UseGuards(JwtAuthGuard)  // PermissionsGuard removed — it runs globally via APP_GUARD
export class PermissionsController {
  
  constructor(private readonly permissionsService: PermissionsService) {}

  // POST /permissions
  @Post()
  @RequirePermissions('roles:create')
  create(@Body() dto: CreatePermissionDto) {
    return this.permissionsService.create(dto);
  }

  // GET /permissions
  @Get()
  @RequirePermissions('roles:read')
  findAll() {
    return this.permissionsService.findAll();
  }

  // GET /permissions/by-resource?resource=users
  // Note: this route must come BEFORE @Get(':id')
  // otherwise NestJS treats 'by-resource' as an :id param
  @Get('by-resource')
  @RequirePermissions('roles:read')
  findByResource(@Query('resource') resource: string) {
    return this.permissionsService.findByResource(resource);
  }

  // GET /permissions/:id
  @Get(':id')
  @RequirePermissions('roles:read')
  findOne(@Param('id') id: string) {
    return this.permissionsService.findOne(id);
  }

  // PATCH /permissions/:id
  @Patch(':id')
  @RequirePermissions('roles:update')
  update(@Param('id') id: string, @Body() dto: UpdatePermissionDto) {
    return this.permissionsService.update(id, dto);
  }

  // DELETE /permissions/:id
  @Delete(':id')
  @RequirePermissions('roles:delete')
  deactivate(@Param('id') id: string) {
    return this.permissionsService.deactivate(id);
  }

  // POST /permissions/seed
  //@Public()
  @Post('seed')
@RequirePermissions('roles:create')
seed() {
  /*
    Seed should only run in development.
    In production this would wipe and recreate all permissions
    which is dangerous if called accidentally.
    NODE_ENV is set automatically by NestJS — 'development' locally,
    'production' on your server.
  */
  if (process.env.NODE_ENV === 'production') {
    throw new ForbiddenException('Seed not available in production');
  }
  return this.permissionsService.seedPermissions();
}
}