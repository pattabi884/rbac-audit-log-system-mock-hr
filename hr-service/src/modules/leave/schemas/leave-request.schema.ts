import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LeaveRequestDocument = LeaveRequest & Document;

@Schema({ timestamps: true })
export class LeaveRequest {
  @Prop({ required: true })
  employeeId: string;

  @Prop({ required: true })
  rbacUserId: string;

  @Prop({ required: true })
  employeeName: string;

  @Prop({ required: true })
  department: string;

  @Prop({ required: true, enum: ['annual', 'sick', 'personal', 'maternity', 'paternity'] })
  leaveType: string;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({ required: true })
  totalDays: number;

  @Prop({ required: true })
  reason: string;

  @Prop({ default: 'pending', enum: ['pending', 'approved', 'rejected'] })
  status: string;

  @Prop()
  approvedBy: string;

  @Prop()
  approvedAt: Date;

  @Prop()
  rejectionReason: string;
}

export const LeaveRequestSchema = SchemaFactory.createForClass(LeaveRequest);