import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { AuditLog, AuditLogSchema } from '@infrastructure/database/schemas/audit-log.schema';
import { AuditService } from './audit.service';
import { AuditProcessor } from './audit.processor';
import { SuspiciousActivityService } from './suspicious-activity.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
    BullModule.registerQueue({ name: 'audit' }),
  ],
  providers: [
    AuditService,
    AuditProcessor,
    SuspiciousActivityService,
  ],
  exports: [AuditService],
})
export class AuditModule {}
