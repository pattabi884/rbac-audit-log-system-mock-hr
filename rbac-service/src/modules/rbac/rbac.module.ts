import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// Existing imports
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { UserRolesModule } from './user-roles/user-roles.module';

// NEW imports
import { ContextEvaluatorService } from './context/context-evaluator.service';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [
    RolesModule,
    PermissionsModule,
    UserRolesModule,
    AuditModule,  // NEW
  ],
  providers: [
    ContextEvaluatorService,  // NEW
  ],
  exports: [
    RolesModule,
    PermissionsModule,
    UserRolesModule,
    ContextEvaluatorService,  // NEW
    AuditModule,  // NEW
  ],
})
export class RbacModule {}