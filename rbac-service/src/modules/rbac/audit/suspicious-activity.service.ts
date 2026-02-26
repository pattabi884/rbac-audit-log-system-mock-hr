import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { AuditLog } from '@infrastructure/database/schemas/audit-log.schema';
import { Model } from 'mongoose';

// Detects anomalies based on behavior patterns

@Injectable()
export class SuspiciousActivityService {

  constructor(
    @InjectModel(AuditLog.name) private auditModel: Model<AuditLog>,
  ) {}

  async analyze(userId: string, log: any) {

    const checks = await Promise.all([
      this.checkRapidDenials(userId),
      this.checkOffHours(log),
    ]);

    return checks.find(c => c.detected) || { detected: false };
  }

  // Multiple denied attempts in short time
  private async checkRapidDenials(userId: string) {
    const oneHourAgo = new Date(Date.now() - 3600000);

    const count = await this.auditModel.countDocuments({
      userId,
      granted: false,
      timestamp: { $gte: oneHourAgo },
    });

    if (count >= 5) {
      return { detected: true, reason: 'Multiple denied attempts' };
    }

    return { detected: false };
  }

  // Sensitive operation outside business hours
  private async checkOffHours(log: any) {
    const hour = new Date(log.context.timestamp).getHours();


    if (hour < 8 || hour >= 20) {
      if (log.permission.includes('delete')) {
        return {
          detected: true,
          reason: 'Sensitive action outside business hours',
        };
      }
    }

    return { detected: false };
  }
}
