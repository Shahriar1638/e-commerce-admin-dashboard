import { IsString, IsArray, IsOptional } from 'class-validator';

export class UpdatePermissionGroupDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsOptional()
  actions?: string[];

  @IsArray()
  @IsOptional()
  customActions?: string[];
}
