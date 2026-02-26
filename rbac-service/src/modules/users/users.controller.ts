import { 
  Controller, 
  Get, 
  Post, 
  Patch, 
  Delete, 
  Body, 
  Param, 
  UseGuards 
} from '@nestjs/common';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
// PermissionsGuard removed from import — it's now a global APP_GUARD in AppModule
// and runs automatically on every route. Listing it here caused NestJS to try
// to instantiate it inside UsersModule, where its dependencies don't exist.
import { RequirePermissions } from '@modules/auth/decorators/require-permissions.decorator';
import { CurrentUser } from '@modules/auth/decorators/current-user.decorator';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)  // PermissionsGuard removed — it runs globally via APP_GUARD
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Only users with 'users:create' permission can access
  @Post()
  @RequirePermissions('users:create')
  create(@Body() createUserDto: any, @CurrentUser() currentUser: any) {
    console.log('Created by:', currentUser.email);
    return this.usersService.create(createUserDto);
  }

  // Only users with 'users:read' permission can access
  @Get()
  @RequirePermissions('users:read')
  findAll() {
    return this.usersService.findAll();
  }

  // Only users with 'users:read' permission can access
  @Get(':id')
  @RequirePermissions('users:read')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  // Only users with 'users:update' permission can access
  @Patch(':id')
  @RequirePermissions('users:update')
  update(@Param('id') id: string, @Body() updateUserDto: any) {
    return this.usersService.update(id, updateUserDto);
  }

  // Only users with 'users:delete' permission can access
  @Delete(':id')
  @RequirePermissions('users:delete')
  remove(@Param('id') id: string) {
    return this.usersService.deactivate(id);
  }

  // Multiple permissions required (user must have ALL of them)
  @Post(':id/promote')
  @RequirePermissions('users:update', 'roles:assign')
  promoteUser(@Param('id') id: string) {
    return this.usersService.promoteUser(id);
  }
}