import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Employee, EmployeeDocument } from './schemas/employee.schema';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(
    @InjectModel(Employee.name)
    private employeeModel: Model<EmployeeDocument>,
  ) {}

  async create(dto: CreateEmployeeDto): Promise<EmployeeDocument> {
    const existing = await this.employeeModel.findOne({ email: dto.email });
    if (existing) throw new ConflictException('Employee with this email already exists');

    const employee = new this.employeeModel(dto);
    this.logger.log(`Creating employee: ${dto.email}`);
    return employee.save();
  }

  async findAll(department?: string): Promise<EmployeeDocument[]> {
    const filter: any = { status: { $ne: 'inactive' } };
    if (department) filter.department = department;
    return this.employeeModel.find(filter).sort({ firstName: 1 }).exec();
  }

  async findOne(id: string): Promise<EmployeeDocument> {
    const employee = await this.employeeModel.findById(id).exec();
    if (!employee) throw new NotFoundException(`Employee ${id} not found`);
    return employee;
  }

  async findByRbacUserId(rbacUserId: string): Promise<EmployeeDocument | null> {
    return this.employeeModel.findOne({ rbacUserId }).exec();
  }

  async update(id: string, dto: UpdateEmployeeDto): Promise<EmployeeDocument> {
    const employee = await this.employeeModel.findByIdAndUpdate(
      id,
      { $set: dto },
      { returnDocument: 'after' },
    ).exec();
    if (!employee) throw new NotFoundException(`Employee ${id} not found`);
    this.logger.log(`Updated employee: ${id}`);
    return employee;
  }

  async deactivate(id: string): Promise<EmployeeDocument> {
    const employee = await this.employeeModel.findByIdAndUpdate(
      id,
      { $set: { status: 'inactive' } },
      { returnDocument: 'after' },
    ).exec();
    if (!employee) throw new NotFoundException(`Employee ${id} not found`);
    return employee;
  }

  async getDepartments(): Promise<string[]> {
    return this.employeeModel.distinct('department').exec();
  }

  async getStats() {
    const [total, byDepartment, byStatus] = await Promise.all([
      this.employeeModel.countDocuments({ status: { $ne: 'inactive' } }),
      this.employeeModel.aggregate([
        { $match: { status: { $ne: 'inactive' } } },
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      this.employeeModel.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);
    return { total, byDepartment, byStatus };
  }
}