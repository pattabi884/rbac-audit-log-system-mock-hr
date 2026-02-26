import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { AuditService } from './audit.service';
import { SuspiciousActivityService } from './suspicious-activity.service';

// Worker that processes jobs asynchronously

@Processor('audit')
export class AuditProcessor extends WorkerHost {

  private logger = new Logger(AuditProcessor.name);

  constructor(
    private auditService: AuditService,
    private suspiciousService: SuspiciousActivityService,
  ) {
    super();
  }

  async process(job: Job<any>) {
    try {
      // Save log
      const auditLog = await this.auditService.storeAuditLog(job.data);

      // Run anomaly detection
      const suspicious = await this.suspiciousService.analyze(job.data.userId, job.data);

      if (suspicious.detected) {
        await this.auditService.markAsSuspicious(
          auditLog._id.toString(),
          // suspicious.reason is string | undefined, so we fall back to a
          // default string if it's missing — ?? means "or if undefined/null"
          suspicious.reason ?? 'No reason provided',
        );

        this.logger.warn(`Suspicious activity detected`);
      }

    } catch (err) {
      this.logger.error(err.message);
      throw err;
    }
  }
}