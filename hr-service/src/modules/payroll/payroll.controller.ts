import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { PermissionGuard, RequirePermission } from '../../common/guards/permission.guard';

@Controller('payroll')
@UseGuards(JwtGuard, PermissionGuard)
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  // Employee views their own payroll — no special permission
  @Get('my-payroll')
  myPayroll(@Request() req: any) {
    return this.payrollService.findMyPayroll(req.user.userId);
  }

  // HR only — view all payroll
  @Get()
  @RequirePermission('payroll:read')
  findAll(
    @Query('year') year?: number,
    @Query('month') month?: number,
  ) {
    return this.payrollService.findAll(year, month);
  }

  // HR only — view specific employee payroll
  @Get('employee/:employeeId')
  @RequirePermission('payroll:read')
  findByEmployee(@Param('employeeId') employeeId: string) {
    return this.payrollService.findByEmployee(employeeId);
  }

  // HR only — create payroll record
  @Post()
  @RequirePermission('payroll:read')
  create(@Body() data: any) {
    return this.payrollService.create(data);
  }
}