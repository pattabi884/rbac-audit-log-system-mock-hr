import { IsString, IsNotEmpty, IsDateString, IsNumber, IsEnum } from 'class-validator';

export class CreateLeaveDto {
  @IsString() @IsNotEmpty()
  employeeId: string;

  @IsString() @IsNotEmpty()
  employeeName: string;

  @IsString() @IsNotEmpty()
  department: string;

  @IsEnum(['annual', 'sick', 'personal', 'maternity', 'paternity'])
  leaveType: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsNumber()
  totalDays: number;

  @IsString() @IsNotEmpty()
  reason: string;
}