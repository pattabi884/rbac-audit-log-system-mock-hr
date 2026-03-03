// src/modules/rbac/roles/roles.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { Role, RoleSchema } from '@infrastructure/database/schemas/role.schema';
import { RbacCacheModule } from '@infrastructure/cache/rbac-cache.module';



@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Role.name, schema: RoleSchema },
    ]),

    // NEW: required because RolesService now injects RbacCacheService
    RbacCacheModule,
  ],

  controllers: [RolesController],

  providers: [RolesService],

  exports: [RolesService],
})
export class RolesModule {}