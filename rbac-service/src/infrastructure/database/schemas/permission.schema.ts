// src/infrastructure/database/schemas/permission.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PermissionDocument = Permission & Document;

@Schema({ timestamps: true })
export class Permission {
  @Prop({ required: true, unique: true })
  name: string; // e.g., "users:delete"
  // unique: true here already creates an index on name automatically.
  // We do NOT need PermissionSchema.index({ name: 1 }) below as well —
  // that was the duplicate that caused the Mongoose warning.

  @Prop({ required: true })
  resource: string; // e.g., "users"

  @Prop({ required: true })
  action: string; // e.g., "delete"

  @Prop()
  description: string; // e.g., "Allows deleting users"

  @Prop({ default: true })
  isActive: boolean;
}

export const PermissionSchema = SchemaFactory.createForClass(Permission);

// Index for fast lookups by resource
PermissionSchema.index({ resource: 1 });

// name index removed — it's already created by unique: true on the @Prop above