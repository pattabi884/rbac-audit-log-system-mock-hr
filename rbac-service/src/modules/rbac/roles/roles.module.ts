// src/modules/rbac/roles/roles.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { Role, RoleSchema } from '@infrastructure/database/schemas/role.schema';

/*
  WHY THIS FILE EXISTS:
  NestJS won't know RolesController and RolesService exist
  until they're registered here. Think of the module file
  as the manifest — it declares what belongs together and
  what gets shared with the outside world via exports.
*/

@Module({
  imports: [
  
    MongooseModule.forFeature([
      { name: Role.name, schema: RoleSchema },
    ]),
  ],

  controllers: [RolesController],

  providers: [RolesService],

  exports: [
  
    RolesService,
  ],
})
export class RolesModule {}