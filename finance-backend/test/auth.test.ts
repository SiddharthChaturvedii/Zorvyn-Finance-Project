import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testUser = {
    email: 'authtest@zorvyn.io',
    fullName: 'Auth Test User',
    password: 'TestP@ss123',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    // Clean up test user if exists
    await prisma.refreshToken.deleteMany({
      where: { user: { email: testUser.email } },
    });
    await prisma.auditLog.deleteMany({
      where: { actor: { email: testUser.email } },
    });
    await prisma.user.deleteMany({ where: { email: testUser.email } });
  });

  afterAll(async () => {
    // Final cleanup
    await prisma.refreshToken.deleteMany({
      where: { user: { email: testUser.email } },
    });
    await prisma.auditLog.deleteMany({
      where: { actor: { email: testUser.email } },
    });
    await prisma.user.deleteMany({ where: { email: testUser.email } });
    await app.close();
  });

  // Register

  it('POST /auth/register — should register a new user', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(testUser)
      .expect(201);

    expect(res.body).toHaveProperty('user');
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user.email).toBe(testUser.email.toLowerCase());
    expect(res.body.user.role).toBe('VIEWER');
    expect(res.body.user).not.toHaveProperty('hashedPassword');
  });

  it('POST /auth/register — should reject duplicate email', async () => {
    // Register first
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(testUser);

    // Try duplicate
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(testUser)
      .expect(409);
  });

  it('POST /auth/register — should reject weak password', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ ...testUser, password: 'weak' })
      .expect(400);
  });

  it('POST /auth/register — should reject missing fields', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'partial@test.io' })
      .expect(400);
  });

  // Login

  it('POST /auth/login — should login with valid credentials', async () => {
    // Register first
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(testUser);

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: testUser.email, password: testUser.password })
      .expect(200);

    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user.email).toBe(testUser.email.toLowerCase());
  });

  it('POST /auth/login — should reject wrong password', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(testUser);

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: testUser.email, password: 'WrongP@ss1' })
      .expect(401);

    expect(res.body.message).toBe('Invalid credentials');
  });

  it('POST /auth/login — should reject nonexistent email with same message', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'nonexistent@test.io', password: 'SomeP@ss1' })
      .expect(401);

    expect(res.body.message).toBe('Invalid credentials');
  });

  // Refresh

  it('POST /auth/refresh — should issue new tokens', async () => {
    const register = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(testUser);

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: register.body.refreshToken })
      .expect(200);

    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    // New refresh token should be different (rotation)
    expect(res.body.refreshToken).not.toBe(register.body.refreshToken);
  });

  it('POST /auth/refresh — should reject invalid token', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'invalid-token-string' })
      .expect(401);
  });

  // Logout

  it('POST /auth/logout — should revoke refresh token', async () => {
    const register = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(testUser);

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .send({ refreshToken: register.body.refreshToken })
      .expect(200);

    // Token should no longer work for refresh
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: register.body.refreshToken })
      .expect(401);
  });

  // Me

  it('GET /auth/me — should return current user profile', async () => {
    const register = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(testUser);

    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${register.body.accessToken}`)
      .expect(200);

    expect(res.body.email).toBe(testUser.email.toLowerCase());
    expect(res.body).not.toHaveProperty('hashedPassword');
  });

  it('GET /auth/me — should reject without token', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .expect(401);
  });
});
