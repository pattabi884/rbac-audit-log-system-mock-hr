// src/infrastructure/database/schemas/user-role.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserRoleDocument = UserRole & Document;

@Schema({ timestamps: true })
export class UserRole {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Role', required: true })
  roleId: Types.ObjectId;

  @Prop({ type: Date, default: Date.now })
  assignedAt: Date;

  @Prop({ type: String })
  assignedBy: string; // Email or ID of admin who assigned this role

  @Prop({ type: Date })
  expiresAt?: Date; // Optional - role can be temporary
}

export const UserRoleSchema = SchemaFactory.createForClass(UserRole);

// Compound index - one user can't have the same role twice
UserRoleSchema.index({ userId: 1, roleId: 1 }, { unique: true });