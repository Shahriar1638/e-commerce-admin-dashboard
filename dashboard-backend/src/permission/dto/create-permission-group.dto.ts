import { IsString, IsArray, IsOptional, ArrayMinSize } from 'class-validator';

export class CreatePermissionGroupDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @ArrayMinSize(1)
  actions: string[];

  @IsArray()
  @IsOptional()
  customActions?: string[];
}
