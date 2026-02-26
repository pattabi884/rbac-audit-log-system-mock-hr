import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PayrollDocument = Payroll & Document;

@Schema({ timestamps: true })
export class Payroll {
  @Prop({ required: true })
  employeeId: string;

  @Prop({ required: true })
  rbacUserId: string;

  @Prop({ required: true })
  month: number;

  @Prop({ required: true })
  year: number;

  @Prop({ required: true })
  basicSalary: number;

  @Prop({ default: 0 })
  bonus: number;

  @Prop({ default: 0 })
  deductions: number;

  @Prop({ required: true })
  netSalary: number;

  @Prop({ default: 'pending', enum: ['pending', 'processed', 'paid'] })
  status: string;

  @Prop()
  paidAt: Date;
}

export const PayrollSchema = SchemaFactory.createForClass(Payroll);