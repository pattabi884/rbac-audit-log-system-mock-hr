import { IsString, IsEmail, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';

export class CreateEmployeeDto {
  @IsString() @IsNotEmpty()
  firstName: string;

  @IsString() @IsNotEmpty()
  lastName: string;

  @IsEmail()
  email: string;

  @IsString() @IsNotEmpty()
  department: string;

  @IsString() @IsNotEmpty()
  position: string;

  @IsString() @IsNotEmpty()
  employeeId: string;

  @IsString() @IsOptional()
  employmentType?: string;

  @IsString() @IsOptional()
  phone?: string;

  @IsString() @IsOptional()
  location?: string;

  @IsDateString() @IsOptional()
  startDate?: string;

  @IsString() @IsOptional()
  managerId?: string;

  @IsString() @IsOptional()
  rbacUserId?: string;
}