import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role, RoleDocument } from '@infrastructure/database/schemas/role.schema';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
//import { CreateRoleDto, UpdateRoleDto } from './dto';



@Injectable()
export class RolesService {
  constructor(
  
    @InjectModel(Role.name)
    private roleModel: Model<RoleDocument>,
  ) {}

  
  async create(createRoleDto: CreateRoleDto): Promise<RoleDocument> {
   
    const existingRole = await this.roleModel.findOne({ name: createRoleDto.name });
    if (existingRole) {
      throw new ConflictException(`Role '${createRoleDto.name}' already exists`);
    }

    const role = new this.roleModel({
    ...createRoleDto,
    isSystemRole: false, // ← always force false, never trust client
  });
 
    return role.save();
  }

 
  async findAll(): Promise<RoleDocument[]> {
    return this.roleModel.find({ isActive: true }).exec();
  }

 
  async findOne(id: string): Promise<RoleDocument> {
    const role = await this.roleModel.findById(id).exec();
    if (!role) {
      throw new NotFoundException(`Role with ID '${id}' not found`);
    }
    return role;
  }


  async update(id: string, updateRoleDto: UpdateRoleDto): Promise<RoleDocument> {
    const role = await this.findOne(id);

    if (role.isSystemRole) {
      throw new ConflictException('Cannot update system roles');
    }

    Object.assign(role, updateRoleDto);
    return role.save();
  }

 
  async addPermission(roleId: string, permission: string): Promise<RoleDocument> {
    const role = await this.findOne(roleId);

    if (!role.permissions.includes(permission)) {
      role.permissions.push(permission);
      await role.save();
    }

    return role;
  }

 
  async removePermission(roleId: string, permission: string): Promise<RoleDocument> {
    const role = await this.findOne(roleId);


    role.permissions = role.permissions.filter(p => p !== permission);
    await role.save();


    return role;
  }

  
  async remove(id: string): Promise<void> {
    const role = await this.findOne(id);

    if (role.isSystemRole) {
      throw new ConflictException('Cannot delete system roles');
    }

    role.isActive = false;
    await role.save();
    // Returns void — caller doesn't need the deactivated role back
  }

 
  async getRolePermissions(roleId: string): Promise<string[]> {
    const role = await this.findOne(roleId);
    return role.permissions;
  }
}