import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectQueue } from '@nestjs/bullmq';
import { Model } from 'mongoose';
import { Queue } from 'bullmq';
import { AuditLog } from '@infrastructure/database/schemas/audit-log.schema';
import { PermissionContext } from '../context/permission-context.interface';

// Structure of log sent to queue
export interface PermissionCheckLog {
  userId: string;
  permission: string;
  granted: boolean;
  reason: string;
  evaluatedRules?: string[];
  context: PermissionContext;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectModel(AuditLog.name) private auditModel: Model<AuditLog>,
    @InjectQueue('audit') private auditQueue: Queue,
  ) {}

  // Adds log to queue so API doesn’t block
  async logPermissionCheck(log: PermissionCheckLog) {
    await this.auditQueue.add('permission-check', log);
  }
    
  // Actually stores log in DB (called by processor)
  async storeAuditLog(log: PermissionCheckLog) {
    const doc = new this.auditModel({
      userId: log.userId,
      userEmail: log.context.userEmail,
      userDepartment: log.context.userDepartment,
      action: 'permission_check',
      permission: log.permission,
      granted: log.granted,
      reason: log.reason,
      evaluatedRules: log.evaluatedRules || [],
      ipAddress: log.context.ipAddress,
      userAgent: log.context.userAgent,
      timestamp: log.context.timestamp,
      resourceId: log.context.resourceId,
      resourceType: log.context.resourceType,
      hasMFA: log.context.hasMFA,
      sessionAge: log.context.sessionAge,
    });

    return doc.save();
  }

  // Query helpers
  async getUserAuditLogs(userId: string, limit = 50) {
    return this.auditModel.find({ userId }).sort({ timestamp: -1 }).limit(limit);
  }

  async getSuspiciousActivity(limit = 100) {
    return this.auditModel.find({ isSuspicious: true }).limit(limit);
  }

async markAsSuspicious(logId: string, reason: string) {
  return this.auditModel.findByIdAndUpdate(
    logId,
    { isSuspicious: true, suspiciousReason: reason },
    { returnDocument: 'after' },
  );
}
}
