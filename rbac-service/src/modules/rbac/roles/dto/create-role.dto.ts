import { IsString, IsArray, IsOptional, IsBoolean, MinLength } from 'class-validator';

export class CreateRoleDto {
    @IsString()
    @MinLength(3)
    name: string;

    @IsString()
    description: string;
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    permissions?: string[];

    @IsBoolean()
    @IsOptional()
    isSystemRole?: boolean;
}
// Never accept isSystemRole from client
// It's not in the DTO so class-validator strips it automatically