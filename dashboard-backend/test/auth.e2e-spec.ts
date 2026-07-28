/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

describe('AuthModule (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await prisma.user.deleteMany();
    await prisma.permission.deleteMany();
    await prisma.role.deleteMany();
  });

  describe('POST /auth/login', () => {
    it('should return 401 for invalid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'wrongpassword' });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid email or password');
    });

    it('should return 401 for invalid password with generic message', async () => {
      const role = await prisma.role.create({
        data: { name: 'Test Role' },
      });

      const hashedPassword = await bcrypt.hash('correctpassword', 10);
      await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: hashedPassword,
          roleId: role.id,
        },
      });

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'wrongpassword' });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid email or password');
    });

    it('should return 403 for inactive user', async () => {
      const role = await prisma.role.create({
        data: { name: 'Test Role' },
      });

      const hashedPassword = await bcrypt.hash('password123', 10);
      await prisma.user.create({
        data: {
          email: 'inactive@example.com',
          password: hashedPassword,
          roleId: role.id,
          isActive: false,
        },
      });

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'inactive@example.com', password: 'password123' });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Account is inactive');
    });

    it('should return tokens for valid credentials', async () => {
      const role = await prisma.role.create({
        data: { name: 'Test Role' },
      });

      const hashedPassword = await bcrypt.hash('password123', 10);
      await prisma.user.create({
        data: {
          email: 'valid@example.com',
          password: hashedPassword,
          roleId: role.id,
        },
      });

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'valid@example.com', password: 'password123' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });
  });

  describe('POST /auth/refresh', () => {
    it('should return 401 for invalid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /auth/session', () => {
    it('should return 401 without token', async () => {
      const response = await request(app.getHttpServer()).get('/auth/session');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('should return 401 without token', async () => {
      const response = await request(app.getHttpServer()).post('/auth/logout');

      expect(response.status).toBe(401);
    });
  });
});
