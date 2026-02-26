// src/modules/rbac/permissions/permissions.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PermissionsService } from './permissions.service';
import { PermissionsController } from './permissions.controller';
import { Permission, PermissionSchema } from '@infrastructure/database/schemas/permission.schema';

@Module({
  imports: [
    // Register the Permission schema with Mongoose
    // This creates the "permissions" collection in MongoDB
    MongooseModule.forFeature([
      { name: Permission.name, schema: PermissionSchema },
    ]),
  ],
  controllers: [PermissionsController],
  providers: [PermissionsService],
  exports: [PermissionsService], // Exported so roles.service can use validatePermissions()
})
export class PermissionsModule {}