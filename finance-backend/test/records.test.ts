import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('Records (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let analystToken: string;
  let adminToken: string;
  let analystUserId: string;
  let createdRecordId: string;

  const analystCreds = { email: 'rec-analyst@zorvyn.io', fullName: 'Record Analyst', password: 'Analyst@123' };
  const adminCreds = { email: 'rec-admin@zorvyn.io', fullName: 'Record Admin', password: 'Admin@123456' };

  const testRecord = {
    amount: 25000.50,
    type: 'INCOME',
    category: 'Revenue',
    date: '2026-03-15',
    description: 'Test revenue entry',
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

    // Clean up
    for (const creds of [analystCreds, adminCreds]) {
      await prisma.financialRecord.deleteMany({ where: { createdBy: { email: creds.email } } });
      await prisma.refreshToken.deleteMany({ where: { user: { email: creds.email } } });
      await prisma.auditLog.deleteMany({ where: { actor: { email: creds.email } } });
      await prisma.user.deleteMany({ where: { email: creds.email } });
    }

    // Register and promote users
    const analystRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(analystCreds);
    analystUserId = analystRes.body.user.id;

    const adminRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(adminCreds);

    await prisma.user.update({ where: { id: analystUserId }, data: { role: 'ANALYST' } });
    await prisma.user.update({ where: { id: adminRes.body.user.id }, data: { role: 'ADMIN' } });

    // Re-login to get correct role tokens
    const analystLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: analystCreds.email, password: analystCreds.password });
    analystToken = analystLogin.body.accessToken;

    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: adminCreds.email, password: adminCreds.password });
    adminToken = adminLogin.body.accessToken;
  });

  afterAll(async () => {
    for (const creds of [analystCreds, adminCreds]) {
      await prisma.financialRecord.deleteMany({ where: { createdBy: { email: creds.email } } });
      await prisma.refreshToken.deleteMany({ where: { user: { email: creds.email } } });
      await prisma.auditLog.deleteMany({ where: { actor: { email: creds.email } } });
      await prisma.user.deleteMany({ where: { email: creds.email } });
    }
    await app.close();
  });

  // Create

  it('POST /records — should create a record as ANALYST', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/records')
      .set('Authorization', `Bearer ${analystToken}`)
      .send(testRecord)
      .expect(201);

    expect(res.body.amount).toBe('25000.5');
    expect(res.body.type).toBe('INCOME');
    expect(res.body.category).toBe('Revenue');
    expect(res.body.createdById).toBe(analystUserId);
    expect(res.body).toHaveProperty('createdBy');
    createdRecordId = res.body.id;
  });

  it('POST /records — should set createdById from token, not body', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/records')
      .set('Authorization', `Bearer ${analystToken}`)
      .send({ ...testRecord, createdById: 'should-be-ignored' })
      .expect(201);

    expect(res.body.createdById).toBe(analystUserId);
  });

  it('POST /records — should reject invalid data', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/records')
      .set('Authorization', `Bearer ${analystToken}`)
      .send({ amount: -5 })
      .expect(400);
  });

  // Read

  it('GET /records — should return paginated results', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/records')
      .set('Authorization', `Bearer ${analystToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('meta');
    expect(res.body.meta).toHaveProperty('total');
    expect(res.body.meta).toHaveProperty('page');
    expect(res.body.meta).toHaveProperty('totalPages');
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /records — should filter by type', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/records?type=INCOME')
      .set('Authorization', `Bearer ${analystToken}`)
      .expect(200);

    for (const record of res.body.data) {
      expect(record.type).toBe('INCOME');
    }
  });

  it('GET /records — should filter by date range', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/records?dateFrom=2026-03-01&dateTo=2026-03-31')
      .set('Authorization', `Bearer ${analystToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('data');
  });

  it('GET /records — should support search on description', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/records?search=Test revenue')
      .set('Authorization', `Bearer ${analystToken}`)
      .expect(200);

    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('GET /records/:id — should return single record', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/records/${createdRecordId}`)
      .set('Authorization', `Bearer ${analystToken}`)
      .expect(200);

    expect(res.body.id).toBe(createdRecordId);
    expect(res.body).toHaveProperty('createdBy');
  });

  it('GET /records/:id — should return 404 for nonexistent', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/records/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${analystToken}`)
      .expect(404);
  });

  // Update

  it('PUT /records/:id — should full update', async () => {
    const res = await request(app.getHttpServer())
      .put(`/api/v1/records/${createdRecordId}`)
      .set('Authorization', `Bearer ${analystToken}`)
      .send({
        amount: 30000,
        type: 'INCOME',
        category: 'Revenue',
        date: '2026-03-20',
        description: 'Updated revenue',
      })
      .expect(200);

    expect(res.body.amount).toBe('30000');
    expect(res.body.description).toBe('Updated revenue');
  });

  it('PATCH /records/:id — should partial update', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/records/${createdRecordId}`)
      .set('Authorization', `Bearer ${analystToken}`)
      .send({ description: 'Patched description' })
      .expect(200);

    expect(res.body.description).toBe('Patched description');
  });

  // Soft Delete & Restore

  it('DELETE /records/:id — should soft delete', async () => {
    // Create a record to delete
    const create = await request(app.getHttpServer())
      .post('/api/v1/records')
      .set('Authorization', `Bearer ${analystToken}`)
      .send({ ...testRecord, description: 'To be deleted' });

    await request(app.getHttpServer())
      .delete(`/api/v1/records/${create.body.id}`)
      .set('Authorization', `Bearer ${analystToken}`)
      .expect(204);

    // Should return 404 now (soft deleted)
    await request(app.getHttpServer())
      .get(`/api/v1/records/${create.body.id}`)
      .set('Authorization', `Bearer ${analystToken}`)
      .expect(404);

    // But the row still exists in DB
    const dbRecord = await prisma.financialRecord.findUnique({
      where: { id: create.body.id },
    });
    expect(dbRecord).not.toBeNull();
    expect(dbRecord!.isDeleted).toBe(true);
  });

  it('POST /records/:id/restore — ADMIN should restore soft-deleted record', async () => {
    // Create and delete as analyst
    const create = await request(app.getHttpServer())
      .post('/api/v1/records')
      .set('Authorization', `Bearer ${analystToken}`)
      .send({ ...testRecord, description: 'To restore' });

    await request(app.getHttpServer())
      .delete(`/api/v1/records/${create.body.id}`)
      .set('Authorization', `Bearer ${analystToken}`);

    // Restore as admin
    const res = await request(app.getHttpServer())
      .post(`/api/v1/records/${create.body.id}/restore`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.isDeleted).toBe(false);
  });

  // Categories

  it('GET /records/categories — should return distinct categories', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/records/categories')
      .set('Authorization', `Bearer ${analystToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toContain('Revenue');
  });

  // CSV Export

  it('GET /records/export — should return CSV', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/records/export')
      .set('Authorization', `Bearer ${analystToken}`)
      .expect(200);

    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('ID,Amount,Type,Category');
  });
});
