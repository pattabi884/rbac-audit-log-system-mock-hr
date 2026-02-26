import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RoleDocument = Role & Document;

@Schema({ timestamps: true })
export class Role{
    @Prop({ required: true, unique: true})
    name: string;// admin manager user

    @Prop({ required: true})
    description: string;

    @Prop({ type: [String], default:[] })
    permissions: string[]; //["users: create", "users:read"]

    @Prop({ default: true})
    isActive: boolean;

    @Prop({ default: true })
    isSystemRole: boolean;// prevents deleteing of built roles
}

export const RoleSchema = SchemaFactory.createForClass(Role);