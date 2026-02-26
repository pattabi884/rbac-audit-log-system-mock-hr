// src/modules/rbac/user-roles/user-roles.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserRolesController } from './user-roles.controller';
import { UserRolesService } from './user-roles.service';
import { UserRole, UserRoleSchema } from '@infrastructure/database/schemas/user-role.schema';
import { Role, RoleSchema } from '@infrastructure/database/schemas/role.schema';
import { RolesModule } from '../roles/roles.module';

// Import the new module so RbacCacheService is accessible in this context
import { RbacCacheModule } from '@infrastructure/cache/rbac-cache.module';



@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserRole.name, schema: UserRoleSchema },
      { name: Role.name, schema: RoleSchema },
    ]),

    RolesModule,
    RbacCacheModule, // <-- this is the fix
  ],

  controllers: [UserRolesController],

  providers: [UserRolesService],

  exports: [
    UserRolesService,
  ],
})
export class UserRolesModule {}