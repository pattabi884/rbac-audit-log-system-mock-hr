
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export interface AuditJobData {
    userId: string;
    userEmail: string;
    //what they were trying to do 
    action: string;// user: delete 
    resource: string //users
    resourceId?: string; // the specific user ID they tried to delete 
    granted: boolean;
    reason: string;
    ipAddress: string;
    userAgent: string;
    timestamp: Date;
    meatdata? : Record<string, any>;
}

@Injectable()
export class QueueService {
    constructor(
        @InjectQueue('audit')
        private auditQueue: Queue,
    ) {}

    async addAuditLog(data: AuditJobData): Promise<void> {
        await this.auditQueue.add(
            'audit-log',
            data,
            {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 1000,
                },
                removeOnComplete: true,
                removeOnFail: false,
            },
        );
    }
    async getQueueStatus(): Promise<{
        waiting: number;
        active: number;
        failed: number;
    }> {
        const [waiting, active, failed] = await Promise.all([
            this.auditQueue.getWaitingCount(),
            this.auditQueue.getActiveCount(),
            this.auditQueue.getFailedCount(),
        ]);
        return { waiting, active, failed};
    }
}