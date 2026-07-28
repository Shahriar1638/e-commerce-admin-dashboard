/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('PermissionModule (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let limitedToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();

    await seedTestData();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await prisma.user.deleteMany();
    await prisma.permission.deleteMany();
    await prisma.permissionGroup.deleteMany();
    await prisma.role.deleteMany();
  });

  async function seedTestData() {
    await prisma.user.deleteMany();
    await prisma.permission.deleteMany();
    await prisma.permissionGroup.deleteMany();
    await prisma.role.deleteMany();

    const adminRole = await prisma.role.create({
      data: { name: 'Admin' },
    });

    const permissions = await Promise.all(
      [
        'permission:create',
        'permission:read',
        'permission:update',
        'permission:delete',
        'permission:watch',
      ].map((name) =>
        prisma.permission.create({
          data: { name, groupId: (await getOrCreateGroup()).id },
        }),
      ),
    );

    await prisma.role.update({
      where: { id: adminRole.id },
      data: {
        permissions: {
          connect: permissions.map((p) => ({ id: p.id })),
        },
      },
    });

    const hashedPassword = await bcrypt.hash('password123', 10);
    await prisma.user.create({
      data: {
        email: 'admin@example.com',
        password: hashedPassword,
        roleId: adminRole.id,
      },
    });

    const limitedRole = await prisma.role.create({
      data: { name: 'Limited' },
    });

    await prisma.user.create({
      data: {
        email: 'limited@example.com',
        password: hashedPassword,
        roleId: limitedRole.id,
      },
    });

    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@example.com', password: 'password123' });
    adminToken = adminLogin.body.accessToken;

    const limitedLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'limited@example.com', password: 'password123' });
    limitedToken = limitedLogin.body.accessToken;
  }

  async function getOrCreateGroup() {
    let group = await prisma.permissionGroup.findFirst({
      where: { name: 'test' },
    });
    if (!group) {
      group = await prisma.permissionGroup.create({
        data: { name: 'test' },
      });
    }
    return group;
  }

  describe('POST /permission-groups', () => {
    it('should create a permission group with permissions', async () => {
      const response = await request(app.getHttpServer())
        .post('/permission-groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Product',
          description: 'Product management',
          actions: ['create', 'read', 'update', 'delete'],
        });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('product');
      expect(response.body.permissions).toHaveLength(4);
      expect(response.body.permissions.map((p: any) => p.name).sort()).toEqual([
        'product:create',
        'product:delete',
        'product:read',
        'product:update',
      ]);
    });

    it('should normalize group and action names', async () => {
      const response = await request(app.getHttpServer())
        .post('/permission-groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: ' User ',
          actions: [' Read '],
        });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('user');
      expect(response.body.permissions[0].name).toBe('user:read');
    });

    it('should handle custom actions', async () => {
      const response = await request(app.getHttpServer())
        .post('/permission-groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Special',
          actions: ['read'],
          customActions: ['discount_apply'],
        });

      expect(response.status).toBe(201);
      expect(response.body.permissions).toHaveLength(2);
      expect(response.body.permissions.map((p: any) => p.name)).toContain(
        'special:discount_apply',
      );
    });

    it('should return 409 for duplicate group name', async () => {
      await request(app.getHttpServer())
        .post('/permission-groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Duplicate', actions: ['read'] });

      const response = await request(app.getHttpServer())
        .post('/permission-groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Duplicate', actions: ['read'] });

      expect(response.status).toBe(409);
    });

    it('should return 401 without token', async () => {
      const response = await request(app.getHttpServer())
        .post('/permission-groups')
        .send({ name: 'Test', actions: ['read'] });

      expect(response.status).toBe(401);
    });

    it('should return 403 without permission:create', async () => {
      const response = await request(app.getHttpServer())
        .post('/permission-groups')
        .set('Authorization', `Bearer ${limitedToken}`)
        .send({ name: 'Test', actions: ['read'] });

      expect(response.status).toBe(403);
    });
  });

  describe('GET /permission-groups', () => {
    it('should return paginated permission groups', async () => {
      await request(app.getHttpServer())
        .post('/permission-groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Group1', actions: ['read'] });

      const response = await request(app.getHttpServer())
        .get('/permission-groups')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.meta).toHaveProperty('total');
      expect(response.body.meta).toHaveProperty('page');
    });

    it('should filter by search query', async () => {
      await request(app.getHttpServer())
        .post('/permission-groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Product', actions: ['read'] });

      await request(app.getHttpServer())
        .post('/permission-groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'User', actions: ['read'] });

      const response = await request(app.getHttpServer())
        .get('/permission-groups?search=product')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('product');
    });
  });

  describe('GET /permission-groups/:id', () => {
    it('should return a single permission group', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/permission-groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Single', actions: ['read'] });

      const response = await request(app.getHttpServer())
        .get(`/permission-groups/${createResponse.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('single');
    });

    it('should return 404 for non-existent group', async () => {
      const response = await request(app.getHttpServer())
        .get('/permission-groups/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /permission-groups/:id', () => {
    it('should update permission group and permissions', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/permission-groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Update', actions: ['read'] });

      const response = await request(app.getHttpServer())
        .patch(`/permission-groups/${createResponse.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated',
          actions: ['read', 'write'],
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('updated');
      expect(response.body.permissions).toHaveLength(2);
    });

    it('should return 404 for non-existent group', async () => {
      const response = await request(app.getHttpServer())
        .patch('/permission-groups/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /permission-groups/:id', () => {
    it('should delete permission group and cascade permissions', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/permission-groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Delete', actions: ['read'] });

      const response = await request(app.getHttpServer())
        .delete(`/permission-groups/${createResponse.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);

      const getResponse = await request(app.getHttpServer())
        .get(`/permission-groups/${createResponse.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(getResponse.status).toBe(404);
    });

    it('should return 404 for non-existent group', async () => {
      const response = await request(app.getHttpServer())
        .delete('/permission-groups/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });
});
