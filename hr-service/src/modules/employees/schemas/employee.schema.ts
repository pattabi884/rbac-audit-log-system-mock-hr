import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EmployeeDocument = Employee & Document;

@Schema({ timestamps: true })
export class Employee {
  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  department: string;

  @Prop({ required: true })
  position: string;

  @Prop({ required: true })
  employeeId: string;

  @Prop({ default: 'full-time' })
  employmentType: string;

  @Prop()
  phone: string;

  @Prop()
  location: string;

  @Prop()
  startDate: Date;

  @Prop()
  managerId: string;

  @Prop({ default: 'active' })
  status: string; // active | inactive | on-leave

  // Links this employee to a user in rbac-service
  @Prop()
  rbacUserId: string;
}

export const EmployeeSchema = SchemaFactory.createForClass(Employee);