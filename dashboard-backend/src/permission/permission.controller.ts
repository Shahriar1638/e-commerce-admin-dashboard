import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PermissionService } from './permission.service';
import { CreatePermissionGroupDto } from './dto/create-permission-group.dto';
import { UpdatePermissionGroupDto } from './dto/update-permission-group.dto';
import { QueryPermissionGroupDto } from './dto/query-permission-group.dto';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('permission-groups')
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Post()
  @RequirePermissions('permission:create')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreatePermissionGroupDto) {
    return this.permissionService.create(dto);
  }

  @Get()
  @RequirePermissions('permission:read')
  async findAll(@Query() query: QueryPermissionGroupDto) {
    return this.permissionService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('permission:read')
  async findOne(@Param('id') id: string) {
    return this.permissionService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('permission:update')
  async update(@Param('id') id: string, @Body() dto: UpdatePermissionGroupDto) {
    return this.permissionService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('permission:delete')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    return this.permissionService.remove(id);
  }
}
