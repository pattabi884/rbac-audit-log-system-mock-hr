import { IsString } from 'class-validator';

export class AddPermissionDto {
  @IsString()
  permission: string;
}