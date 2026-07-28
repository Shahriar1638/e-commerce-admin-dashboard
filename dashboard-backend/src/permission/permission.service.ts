import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePermissionGroupDto } from './dto/create-permission-group.dto';
import { UpdatePermissionGroupDto } from './dto/update-permission-group.dto';
import { QueryPermissionGroupDto } from './dto/query-permission-group.dto';
import { normalizeGroupName, buildPermissionName } from './utils/normalize';

@Injectable()
export class PermissionService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePermissionGroupDto) {
    const normalizedName = normalizeGroupName(dto.name);

    const existing = await this.prisma.permissionGroup.findUnique({
      where: { name: normalizedName },
    });

    if (existing) {
      throw new ConflictException(
        `Permission group "${normalizedName}" already exists`,
      );
    }

    const allActions = [
      ...new Set([...dto.actions, ...(dto.customActions || [])]),
    ];

    if (allActions.length === 0) {
      throw new BadRequestException('At least one action is required');
    }

    const permissions = allActions.map((action) => ({
      name: buildPermissionName(dto.name, action),
      description: null,
    }));

    const result = await this.prisma.$transaction(async (tx) => {
      const group = await tx.permissionGroup.create({
        data: {
          name: normalizedName,
          description: dto.description,
          permissions: {
            create: permissions,
          },
        },
        include: {
          permissions: true,
        },
      });

      return group;
    });

    return result;
  }

  async findAll(query: QueryPermissionGroupDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where = query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' as const } },
            {
              permissions: {
                some: {
                  name: {
                    contains: query.search,
                    mode: 'insensitive' as const,
                  },
                },
              },
            },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.permissionGroup.findMany({
        where,
        include: {
          permissions: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.permissionGroup.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const group = await this.prisma.permissionGroup.findUnique({
      where: { id },
      include: {
        permissions: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException(`Permission group with ID "${id}" not found`);
    }

    return group;
  }

  async update(id: string, dto: UpdatePermissionGroupDto) {
    const existing = await this.prisma.permissionGroup.findUnique({
      where: { id },
      include: { permissions: true },
    });

    if (!existing) {
      throw new NotFoundException(`Permission group with ID "${id}" not found`);
    }

    const groupName = dto.name ? normalizeGroupName(dto.name) : existing.name;

    if (dto.name && dto.name !== existing.name) {
      const nameTaken = await this.prisma.permissionGroup.findUnique({
        where: { name: groupName },
      });

      if (nameTaken) {
        throw new ConflictException(
          `Permission group "${groupName}" already exists`,
        );
      }
    }

    const allActions = dto.actions
      ? [...new Set([...dto.actions, ...(dto.customActions || [])])]
      : null;

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.permissionGroup.update({
        where: { id },
        data: {
          name: groupName,
          description: dto.description ?? existing.description,
        },
      });

      if (allActions !== null) {
        const newPermissionNames = allActions.map((action) =>
          buildPermissionName(groupName, action),
        );

        const existingPermissionNames = existing.permissions.map((p) => p.name);
        const permissionsToAdd = newPermissionNames.filter(
          (name) => !existingPermissionNames.includes(name),
        );
        const permissionsToRemove = existing.permissions.filter(
          (p) => !newPermissionNames.includes(p.name),
        );

        if (permissionsToRemove.length > 0) {
          await tx.permission.deleteMany({
            where: {
              id: { in: permissionsToRemove.map((p) => p.id) },
            },
          });
        }

        if (permissionsToAdd.length > 0) {
          await tx.permission.createMany({
            data: permissionsToAdd.map((name) => ({
              name,
              groupId: id,
            })),
          });
        }
      }

      return tx.permissionGroup.findUnique({
        where: { id },
        include: { permissions: true },
      });
    });

    return result;
  }

  async remove(id: string) {
    const existing = await this.prisma.permissionGroup.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Permission group with ID "${id}" not found`);
    }

    await this.prisma.permissionGroup.delete({
      where: { id },
    });

    return { message: 'Permission group deleted successfully' };
  }
}
