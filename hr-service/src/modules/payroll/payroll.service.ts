import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payroll, PayrollDocument } from './schemas/payroll.schema';

@Injectable()
export class PayrollService {
  private readonly logger = new Logger(PayrollService.name);

  constructor(
    @InjectModel(Payroll.name)
    private payrollModel: Model<PayrollDocument>,
  ) {}

  async create(data: Partial<Payroll>): Promise<PayrollDocument> {
    const payroll = new this.payrollModel({
      ...data,
      netSalary: (data.basicSalary || 0) + (data.bonus || 0) - (data.deductions || 0),
    });
    return payroll.save();
  }

  async findByEmployee(employeeId: string): Promise<PayrollDocument[]> {
    return this.payrollModel.find({ employeeId }).sort({ year: -1, month: -1 }).exec();
  }

  async findMyPayroll(rbacUserId: string): Promise<PayrollDocument[]> {
    return this.payrollModel.find({ rbacUserId }).sort({ year: -1, month: -1 }).exec();
  }

  async findAll(year?: number, month?: number): Promise<PayrollDocument[]> {
    const filter: any = {};
    if (year) filter.year = year;
    if (month) filter.month = month;
    return this.payrollModel.find(filter).sort({ year: -1, month: -1 }).exec();
  }

  async seed(employeeId: string, rbacUserId: string, basicSalary: number) {
    // Creates 3 months of payroll history for demo
    const months = [
      { month: 1, year: 2026, bonus: 500, deductions: 200 },
      { month: 12, year: 2025, bonus: 1000, deductions: 200 },
      { month: 11, year: 2025, bonus: 0, deductions: 200 },
    ];
    for (const m of months) {
      await this.create({ employeeId, rbacUserId, basicSalary, ...m });
    }
  }
}