// src/modules/rbac/permissions/permissions.service.ts
//
// ─── WHY THIS FILE CHANGED ──────────────────────────────────────────────────
//
// 'bonus:approve' was missing from seedPermissions().
//
// The Permission collection is a REGISTRY — it documents every action
// that exists in the system. Even though PermissionsGuard works with plain
// strings on Role.permissions[], having every permission registered here:
//
//   1. Makes the system self-documenting — you can call GET /permissions
//      and see every permission in the system without reading the code
//
//   2. Allows validatePermissions() to catch typos — if someone tries to add
//      'bonus:aprove' (typo) to a role, validation fails with a clear error
//      rather than silently creating a broken permission string
//
//   3. Allows the frontend admin UI to list available permissions when
//      building new roles, without hardcoding them in the UI
//
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Permission, PermissionDocument } from 'src/infrastructure/database/schemas/permission.schema';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectModel(Permission.name)
    private permissionModel: Model<PermissionDocument>,
  ) {}

  async create(dto: CreatePermissionDto): Promise<PermissionDocument> {
    const existing = await this.permissionModel.findOne({ name: dto.name });
    if (existing) {
      throw new ConflictException(`Permission ${dto.name} already exists`);
    }
    const permission = new this.permissionModel(dto);
    return permission.save();
  }

  async findAll(): Promise<PermissionDocument[]> {
    return this.permissionModel.find().sort({ resource: 1, action: 1 });
  }

  async findOne(id: string): Promise<PermissionDocument> {
    const permission = await this.permissionModel.findById(id);
    if (!permission) {
      throw new NotFoundException(`Permission ${id} not found`);
    }
    return permission;
  }

  async findByResource(resource: string): Promise<PermissionDocument[]> {
    return this.permissionModel
      .find({ resource, isActive: true })
      .sort({ action: 1 });
  }

  async update(id: string, dto: UpdatePermissionDto): Promise<PermissionDocument> {
    const permission = await this.permissionModel.findByIdAndUpdate(
      id,
      { $set: dto },
      { returnDocument: 'after' },
    );
    if (!permission) {
      throw new NotFoundException(`Permission ${id} not found`);
    }
    return permission;
  }

  async deactivate(id: string): Promise<PermissionDocument> {
    const permission = await this.permissionModel.findByIdAndUpdate(
      id,
      { isActive: false },
      { returnDocument: 'after' },
    );
    if (!permission) {
      throw new NotFoundException(`Permission ${id} not found`);
    }
    return permission;
  }

  async validatePermissions(names: string[]): Promise<boolean> {
    const found = await this.permissionModel.countDocuments({
      name: { $in: names },
      isActive: true,
    });
    return found === names.length;
  }

  // ─── SEED PERMISSIONS ───────────────────────────────────────────────────────
  //
  // Uses upsert ($setOnInsert) so running this multiple times is safe —
  // it only inserts if the permission name doesn't already exist.
  // Existing permissions are never overwritten.
  //
  // HOW TO RUN: POST /permissions/seed (requires roles:create permission)
  //
  async seedPermissions(): Promise<void> {
    const defaultPermissions = [
      // Users
      { name: 'users:create',    resource: 'users',     action: 'create',  description: 'Create new users' },
      { name: 'users:read',      resource: 'users',     action: 'read',    description: 'Read user data' },
      { name: 'users:update',    resource: 'users',     action: 'update',  description: 'Update user data' },
      { name: 'users:delete',    resource: 'users',     action: 'delete',  description: 'Delete users' },

      // Roles
      { name: 'roles:create',    resource: 'roles',     action: 'create',  description: 'Create new roles' },
      { name: 'roles:read',      resource: 'roles',     action: 'read',    description: 'Read role data' },
      { name: 'roles:update',    resource: 'roles',     action: 'update',  description: 'Update roles' },
      { name: 'roles:delete',    resource: 'roles',     action: 'delete',  description: 'Delete roles' },
      { name: 'roles:assign',    resource: 'roles',     action: 'assign',  description: 'Assign roles to users' },

      // Reports
      { name: 'reports:read',    resource: 'reports',   action: 'read',    description: 'Read reports' },
      { name: 'reports:export',  resource: 'reports',   action: 'export',  description: 'Export reports' },

      // Invoices
      { name: 'invoices:approve',resource: 'invoices',  action: 'approve', description: 'Approve invoices' },

      // Employees (HR service domain)
      { name: 'employees:create',resource: 'employees', action: 'create',  description: 'Create new employee records' },
      { name: 'employees:read',  resource: 'employees', action: 'read',    description: 'View employee directory' },
      { name: 'employees:update',resource: 'employees', action: 'update',  description: 'Update employee information' },
      { name: 'employees:delete',resource: 'employees', action: 'delete',  description: 'Deactivate employees' },

      // Leave
      { name: 'leave:create',    resource: 'leave',     action: 'create',  description: 'Submit leave requests' },
      { name: 'leave:read',      resource: 'leave',     action: 'read',    description: 'View all leave requests' },
      { name: 'leave:approve',   resource: 'leave',     action: 'approve', description: 'Approve or reject leave requests' },

      // Payroll
      { name: 'payroll:read',    resource: 'payroll',   action: 'read',    description: 'View payroll information' },

      // ── NEW ─────────────────────────────────────────────────────────────────
      //
      // bonus:approve was missing — this is the permission the e2e tests verify.
      // Without this entry the Permission collection had no record of this
      // action existing, which made validatePermissions() return false if
      // anyone tried to add it to a role through the API.
      //
      { name: 'bonus:approve',   resource: 'bonus',     action: 'approve', description: 'Approve employee bonus payouts' },
    ];

    for (const perm of defaultPermissions) {
      await this.permissionModel.findOneAndUpdate(
        { name: perm.name },
        { $setOnInsert: perm },
        { upsert: true, new: true },
      );
    }
  }
}