import {
  Controller, Get, Post, Patch,
  Param, Body, Query, UseGuards, Request,
} from '@nestjs/common';
import { LeaveService } from './leave.service';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { PermissionGuard, RequirePermission } from '../../common/guards/permission.guard';

@Controller('leave')
@UseGuards(JwtGuard, PermissionGuard)
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  // Any authenticated employee can submit leave
  @Post()
  create(@Body() dto: CreateLeaveDto, @Request() req: any) {
    return this.leaveService.create(dto, req.user.userId);
  }

  // View own requests — no special permission needed
  @Get('my-requests')
  myRequests(@Request() req: any) {
    return this.leaveService.findMyRequests(req.user.userId);
  }

  // Stats — managers and above
  @Get('stats')
  @RequirePermission('leave:approve')
  getStats() {
    return this.leaveService.getStats();
  }

  // All requests — managers and above
  @Get()
  @RequirePermission('leave:read')
  findAll(
    @Query('status') status?: string,
    @Query('department') department?: string,
  ) {
    return this.leaveService.findAll({ status, department });
  }

  @Get(':id')
  @RequirePermission('leave:read')
  findOne(@Param('id') id: string) {
    return this.leaveService.findOne(id);
  }

  @Patch(':id/approve')
  @RequirePermission('leave:approve')
  approve(@Param('id') id: string, @Request() req: any) {
    return this.leaveService.approve(id, req.user.email);
  }

  @Patch(':id/reject')
  @RequirePermission('leave:approve')
  reject(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { reason: string },
  ) {
    return this.leaveService.reject(id, req.user.email, body.reason);
  }
}