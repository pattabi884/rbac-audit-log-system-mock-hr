import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LeaveRequest, LeaveRequestDocument } from './schemas/leave-request.schema';
import { CreateLeaveDto } from './dto/create-leave.dto';

@Injectable()
export class LeaveService {
  private readonly logger = new Logger(LeaveService.name);

  constructor(
    @InjectModel(LeaveRequest.name)
    private leaveModel: Model<LeaveRequestDocument>,
  ) {}

  async create(dto: CreateLeaveDto, rbacUserId: string): Promise<LeaveRequestDocument> {
    const leave = new this.leaveModel({ ...dto, rbacUserId });
    this.logger.log(`Leave request created for employee: ${dto.employeeId}`);
    return leave.save();
  }

  async findAll(filters?: { status?: string; department?: string }): Promise<LeaveRequestDocument[]> {
    const query: any = {};
    if (filters?.status) query.status = filters.status;
    if (filters?.department) query.department = filters.department;
    return this.leaveModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async findMyRequests(rbacUserId: string): Promise<LeaveRequestDocument[]> {
    return this.leaveModel.find({ rbacUserId }).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<LeaveRequestDocument> {
    const leave = await this.leaveModel.findById(id).exec();
    if (!leave) throw new NotFoundException(`Leave request ${id} not found`);
    return leave;
  }

  async approve(id: string, approverEmail: string): Promise<LeaveRequestDocument> {
    const leave = await this.findOne(id);
    if (leave.status !== 'pending') {
      throw new ForbiddenException('Only pending requests can be approved');
    }
    leave.status = 'approved';
    leave.approvedBy = approverEmail;
    leave.approvedAt = new Date();
    this.logger.log(`Leave request ${id} approved by ${approverEmail}`);
    return leave.save();
  }

  async reject(id: string, approverEmail: string, reason: string): Promise<LeaveRequestDocument> {
    const leave = await this.findOne(id);
    if (leave.status !== 'pending') {
      throw new ForbiddenException('Only pending requests can be rejected');
    }
    leave.status = 'rejected';
    leave.approvedBy = approverEmail;
    leave.rejectionReason = reason;
    this.logger.log(`Leave request ${id} rejected by ${approverEmail}`);
    return leave.save();
  }

  async getStats() {
    const [total, pending, approved, rejected] = await Promise.all([
      this.leaveModel.countDocuments(),
      this.leaveModel.countDocuments({ status: 'pending' }),
      this.leaveModel.countDocuments({ status: 'approved' }),
      this.leaveModel.countDocuments({ status: 'rejected' }),
    ]);
    return { total, pending, approved, rejected };
  }
}