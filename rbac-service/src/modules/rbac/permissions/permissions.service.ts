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
    ){}

    // Create a new permission
    async create(dto: CreatePermissionDto): Promise<PermissionDocument>{
        // Check if permission already exists
        const existing = await this.permissionModel.findOne({ name: dto.name});
        if(existing){
            throw new ConflictException(`Permission ${dto.name} already exists`);
        }
        const permission = new this.permissionModel(dto);
        return permission.save();
    }

    // Get all permissions
    async findAll(): Promise<PermissionDocument[]>{
        return this.permissionModel.find().sort({ resource: 1, action: 1 });
    }

    // Get one permission by ID
    async findOne(id: string): Promise<PermissionDocument>{
        const permission = await this.permissionModel.findById(id);
        if(!permission){
            throw new NotFoundException(`Permission ${id} not found`);
        }
        return permission;
    }

    // Get all permissions for a specific resource
    // e.g. findByResource('users') returns all users:read, users:create, etc.
    async findByResource(resource: string): Promise<PermissionDocument[]> {
        return this.permissionModel
            .find({ resource, isActive: true })
            .sort({ action: 1 });
    }

    // Update a permission by ID
    async update(id: string, dto: UpdatePermissionDto): Promise<PermissionDocument>{
        const permission = await this.permissionModel.findByIdAndUpdate(
            id, 
            { $set: dto},
            { returnDocument: 'after' }, // return updated document, not the original
        );
        if(!permission){
            throw new NotFoundException(`Permission ${id} not found`);
        }
        return permission;
    }

    // Soft delete — sets isActive: false instead of removing from DB
    // This preserves audit history while hiding the permission from active use
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

    // Validate that a list of permission names all exist
    // Used by roles.service when adding permissions to a role
    async validatePermissions(names: string[]): Promise<boolean>{
        const found = await this.permissionModel.countDocuments({
            name: { $in: names },
            isActive: true,
        });
        return found === names.length;
    }

    // Seed the initial permissions — called once on app startup
    async seedPermissions(): Promise<void> {
        const defaultPermissions = [
            // Users
            { name: 'users:create', resource: 'users', action: 'create', description: 'Create new users' },
            { name: 'users:read', resource: 'users', action: 'read', description: 'Read user data' },
            { name: 'users:update', resource: 'users', action: 'update', description: 'Update user data' },
            { name: 'users:delete', resource: 'users', action: 'delete', description: 'Delete users' },
            // Roles
            { name: 'roles:create', resource: 'roles', action: 'create', description: 'Create new roles' },
            { name: 'roles:read', resource: 'roles', action: 'read', description: 'Read role data' },
            { name: 'roles:update', resource: 'roles', action: 'update', description: 'Update roles' },
            { name: 'roles:delete', resource: 'roles', action: 'delete', description: 'Delete roles' },
            { name: 'roles:assign', resource: 'roles', action: 'assign', description: 'Assign roles to users' },
            // Reports
            { name: 'reports:read', resource: 'reports', action: 'read', description: 'Read reports' },
            { name: 'reports:export', resource: 'reports', action: 'export', description: 'Export reports' },
            // Invoices
            { name: 'invoices:approve', resource: 'invoices', action: 'approve', description: 'Approve invoices' },
            //hr service 
            { name: 'employees:create', resource: 'employees', action: 'create', description: 'Create new employee records' },
{ name: 'employees:read', resource: 'employees', action: 'read', description: 'View employee directory' },
{ name: 'employees:update', resource: 'employees', action: 'update', description: 'Update employee information' },
{ name: 'employees:delete', resource: 'employees', action: 'delete', description: 'Deactivate employees' },
{ name: 'leave:create', resource: 'leave', action: 'create', description: 'Submit leave requests' },
{ name: 'leave:read', resource: 'leave', action: 'read', description: 'View all leave requests' },
{ name: 'leave:approve', resource: 'leave', action: 'approve', description: 'Approve or reject leave requests' },
{ name: 'payroll:read', resource: 'payroll', action: 'read', description: 'View payroll information' },
        
        
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