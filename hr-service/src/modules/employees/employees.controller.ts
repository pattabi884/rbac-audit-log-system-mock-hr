import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { PermissionGuard, RequirePermission } from '../../common/guards/permission.guard';

@Controller('employees')
@UseGuards(JwtGuard, PermissionGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @RequirePermission('employees:create')
  create(@Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(dto);
  }

  @Get()
  @RequirePermission('employees:read')
  findAll(@Query('department') department?: string) {
    return this.employeesService.findAll(department);
  }

  @Get('stats')
  @RequirePermission('employees:read')
  getStats() {
    return this.employeesService.getStats();
  }

  @Get('departments')
  @RequirePermission('employees:read')
  getDepartments() {
    return this.employeesService.getDepartments();
  }

  // No permission decorator — any authenticated user can view their own profile
  @Get('me')
  getMyProfile(@Request() req: any) {
    return this.employeesService.findByRbacUserId(req.user.userId);
  }

  @Get(':id')
  @RequirePermission('employees:read')
  findOne(@Param('id') id: string) {
    return this.employeesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('employees:update')
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.employeesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('employees:delete')
  deactivate(@Param('id') id: string) {
    return this.employeesService.deactivate(id);
  }
}