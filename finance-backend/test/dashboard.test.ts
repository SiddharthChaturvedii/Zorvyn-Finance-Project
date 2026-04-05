import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('Dashboard (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let analystToken: string;

  const analystCreds = { email: 'dash-analyst@zorvyn.io', fullName: 'Dash Analyst', password: 'Analyst@123' };

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

    // Clean up and set up analyst
    await prisma.financialRecord.deleteMany({ where: { createdBy: { email: analystCreds.email } } });
    await prisma.refreshToken.deleteMany({ where: { user: { email: analystCreds.email } } });
    await prisma.auditLog.deleteMany({ where: { actor: { email: analystCreds.email } } });
    await prisma.user.deleteMany({ where: { email: analystCreds.email } });

    const reg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(analystCreds);

    await prisma.user.update({ where: { id: reg.body.user.id }, data: { role: 'ANALYST' } });

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: analystCreds.email, password: analystCreds.password });
    analystToken = login.body.accessToken;

    // Create some test records for analytics
    const records = [
      { amount: 50000, type: 'INCOME', category: 'Revenue', date: '2026-03-01' },
      { amount: 30000, type: 'INCOME', category: 'Revenue', date: '2026-02-15' },
      { amount: 15000, type: 'EXPENSE', category: 'Marketing', date: '2026-03-10' },
      { amount: 8000, type: 'EXPENSE', category: 'Utilities', date: '2026-03-20' },
      { amount: 25000, type: 'EXPENSE', category: 'Payroll', date: '2026-02-28' },
    ];

    for (const rec of records) {
      await request(app.getHttpServer())
        .post('/api/v1/records')
        .set('Authorization', `Bearer ${analystToken}`)
        .send(rec);
    }
  });

  afterAll(async () => {
    await prisma.financialRecord.deleteMany({ where: { createdBy: { email: analystCreds.email } } });
    await prisma.refreshToken.deleteMany({ where: { user: { email: analystCreds.email } } });
    await prisma.auditLog.deleteMany({ where: { actor: { email: analystCreds.email } } });
    await prisma.user.deleteMany({ where: { email: analystCreds.email } });
    await app.close();
  });

  // Summary

  it('GET /dashboard/summary — should return correct shape', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/dashboard/summary')
      .set('Authorization', `Bearer ${analystToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('totalIncome');
    expect(res.body).toHaveProperty('totalExpenses');
    expect(res.body).toHaveProperty('netBalance');
    expect(res.body).toHaveProperty('recordCount');
    expect(res.body).toHaveProperty('incomeRecordCount');
    expect(res.body).toHaveProperty('expenseRecordCount');
    expect(typeof res.body.totalIncome).toBe('string');
  });

  // Category Breakdown

  it('GET /dashboard/by-category — should return category breakdown', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/dashboard/by-category')
      .set('Authorization', `Bearer ${analystToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty('category');
      expect(res.body[0]).toHaveProperty('totalIncome');
      expect(res.body[0]).toHaveProperty('totalExpense');
      expect(res.body[0]).toHaveProperty('netAmount');
      expect(res.body[0]).toHaveProperty('recordCount');
    }
  });

  // Monthly Trend

  it('GET /dashboard/monthly-trend — should return monthly data', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/dashboard/monthly-trend?months=6')
      .set('Authorization', `Bearer ${analystToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty('month');
      expect(res.body[0]).toHaveProperty('income');
      expect(res.body[0]).toHaveProperty('expense');
      expect(res.body[0]).toHaveProperty('net');
    }
  });

  // Weekly Trend

  it('GET /dashboard/weekly-trend — should return weekly data', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/dashboard/weekly-trend')
      .set('Authorization', `Bearer ${analystToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });

  // Recent Activity

  it('GET /dashboard/recent-activity — should return recent records', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/dashboard/recent-activity?limit=5')
      .set('Authorization', `Bearer ${analystToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeLessThanOrEqual(5);
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty('id');
      expect(res.body[0]).toHaveProperty('amount');
      expect(res.body[0]).toHaveProperty('createdBy');
    }
  });

  // Top Categories

  it('GET /dashboard/top-categories — should return top spending categories', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/dashboard/top-categories')
      .set('Authorization', `Bearer ${analystToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty('category');
      expect(res.body[0]).toHaveProperty('totalSpend');
    }
  });

  // Balance Over Time

  it('GET /dashboard/balance-over-time — should return running balance', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/dashboard/balance-over-time')
      .set('Authorization', `Bearer ${analystToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty('month');
      expect(res.body[0]).toHaveProperty('net');
      expect(res.body[0]).toHaveProperty('runningBalance');
    }
  });

  // Income vs Expense

  it('GET /dashboard/income-vs-expense — should return period comparison', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/dashboard/income-vs-expense?period=month')
      .set('Authorization', `Bearer ${analystToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('current');
    expect(res.body).toHaveProperty('previous');
    expect(res.body).toHaveProperty('changes');
    expect(res.body.current).toHaveProperty('period');
    expect(res.body.current).toHaveProperty('income');
    expect(res.body.changes).toHaveProperty('incomeChangePercent');
  });

  // Unauthenticated

  it('Dashboard should reject unauthenticated requests — 401', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/dashboard/summary')
      .expect(401);
  });
});
