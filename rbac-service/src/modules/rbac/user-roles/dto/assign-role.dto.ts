import { IsString, IsNotEmpty } from 'class-validator';

export class AssignRoleDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  roleId: string;

  @IsString()
  @IsNotEmpty()
  assignedBy: string;
}