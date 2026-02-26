import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class AuditLog extends Document {
  // Who
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  userEmail: string;

  @Prop()
  userDepartment?: string;

  // What
  @Prop({ required: true })
  action: string; // 'permission_check', 'role_assigned', 'role_removed', etc.

  @Prop({ required: true })
  permission: string; // e.g., 'users:delete'

  @Prop({ required: true })
  granted: boolean;

  @Prop()
  reason: string;

  @Prop({ type: [String], default: [] })
  evaluatedRules: string[];

  // Where/When
  @Prop({ required: true })
  ipAddress: string;

  @Prop()
  userAgent: string;

  @Prop({ required: true, index: true })
  timestamp: Date;

  // Resource
  @Prop()
  resourceId?: string;

  @Prop()
  resourceType: string;

  // Security context
  @Prop({ default: false })
  hasMFA: boolean;

  @Prop()
  sessionAge: number; // minutes

  // Metadata
  @Prop({ type: Object })
  metadata?: Record<string, any>;

  // Flagged as suspicious?
  @Prop({ default: false, index: true })
  isSuspicious: boolean;

  @Prop()
  suspiciousReason?: string;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

// Indexes for efficient queries
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ granted: 1, timestamp: -1 });
AuditLogSchema.index({ isSuspicious: 1, timestamp: -1 });
AuditLogSchema.index({ permission: 1, timestamp: -1 });