import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('RBAC Enforcement (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let adminToken: string;
  let analystToken: string;
  let viewerToken: string;
  let analystUserId: string;
  let viewerUserId: string;
  let analystRecordId: string;

  const adminCreds = { email: 'rbac-admin@zorvyn.io', fullName: 'RBAC Admin', password: 'Admin@123456' };
  const analystCreds = { email: 'rbac-analyst@zorvyn.io', fullName: 'RBAC Analyst', password: 'Analyst@123' };
  const viewerCreds = { email: 'rbac-viewer@zorvyn.io', fullName: 'RBAC Viewer', password: 'Viewer@123' };

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

    // Clean up and register test users
    for (const creds of [adminCreds, analystCreds, viewerCreds]) {
      await prisma.financialRecord.deleteMany({ where: { createdBy: { email: creds.email } } });
      await prisma.refreshToken.deleteMany({ where: { user: { email: creds.email } } });
      await prisma.auditLog.deleteMany({ where: { actor: { email: creds.email } } });
      await prisma.user.deleteMany({ where: { email: creds.email } });
    }

    // Register all three users
    const adminRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(adminCreds);
    adminToken = adminRes.body.accessToken;
    const adminUserId = adminRes.body.user.id;

    const analystRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(analystCreds);
    analystToken = analystRes.body.accessToken;
    analystUserId = analystRes.body.user.id;

    const viewerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(viewerCreds);
    viewerToken = viewerRes.body.accessToken;
    viewerUserId = viewerRes.body.user.id;

    // Promote admin and analyst via DB (since register gives VIEWER)
    await prisma.user.update({ where: { id: adminUserId }, data: { role: 'ADMIN' } });
    await prisma.user.update({ where: { id: analystUserId }, data: { role: 'ANALYST' } });

    // Re-login to get tokens with correct roles
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: adminCreds.email, password: adminCreds.password });
    adminToken = adminLogin.body.accessToken;

    const analystLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: analystCreds.email, password: analystCreds.password });
    analystToken = analystLogin.body.accessToken;

    // Create a record as analyst for permission tests
    const recordRes = await request(app.getHttpServer())
      .post('/api/v1/records')
      .set('Authorization', `Bearer ${analystToken}`)
      .send({
        amount: 5000,
        type: 'INCOME',
        category: 'Revenue',
        date: '2026-04-01',
        description: 'RBAC test record',
      });
    analystRecordId = recordRes.body.id;
  });

  afterAll(async () => {
    for (const creds of [adminCreds, analystCreds, viewerCreds]) {
      await prisma.financialRecord.deleteMany({ where: { createdBy: { email: creds.email } } });
      await prisma.refreshToken.deleteMany({ where: { user: { email: creds.email } } });
      await prisma.auditLog.deleteMany({ where: { actor: { email: creds.email } } });
      await prisma.user.deleteMany({ where: { email: creds.email } });
    }
    await app.close();
  });

  // VIEWER Restrictions

  it('VIEWER cannot create a record — 403', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/records')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        amount: 1000,
        type: 'INCOME',
        category: 'Revenue',
        date: '2026-04-01',
      })
      .expect(403);
  });

  it('VIEWER cannot update a record — 403', async () => {
    await request(app.getHttpServer())
      .put(`/api/v1/records/${analystRecordId}`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        amount: 999,
        type: 'INCOME',
        category: 'Revenue',
        date: '2026-04-01',
      })
      .expect(403);
  });

  it('VIEWER cannot delete a record — 403', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/records/${analystRecordId}`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .expect(403);
  });

  it('VIEWER cannot access /users — 403', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${viewerToken}`)
      .expect(403);
  });

  it('VIEWER cannot access another user\'s record — 403', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/records/${analystRecordId}`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .expect(403);
  });

  it('VIEWER cannot export records — 403', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/records/export')
      .set('Authorization', `Bearer ${viewerToken}`)
      .expect(403);
  });

  // ANALYST Restrictions

  it('ANALYST cannot access /users — 403', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${analystToken}`)
      .expect(403);
  });

  it('ANALYST cannot change user roles — 403', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/users/${viewerUserId}/role`)
      .set('Authorization', `Bearer ${analystToken}`)
      .send({ role: 'ADMIN' })
      .expect(403);
  });

  it('ANALYST cannot view audit logs — 403', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/audit-logs')
      .set('Authorization', `Bearer ${analystToken}`)
      .expect(403);
  });

  it('ANALYST cannot restore soft-deleted records — 403', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/records/${analystRecordId}/restore`)
      .set('Authorization', `Bearer ${analystToken}`)
      .expect(403);
  });

  // ADMIN Allowed Actions

  it('ADMIN can access /users — 200', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  it('ADMIN can view audit logs — 200', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  // Dashboard — All Roles

  it('VIEWER can access dashboard — 200', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/dashboard/summary')
      .set('Authorization', `Bearer ${viewerToken}`)
      .expect(200);
  });

  it('ANALYST can access dashboard — 200', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/dashboard/summary')
      .set('Authorization', `Bearer ${analystToken}`)
      .expect(200);
  });

  // Unauthenticated

  it('Unauthenticated request to protected route — 401', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/records')
      .expect(401);
  });
});
