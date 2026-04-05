import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../records/redis.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  // Summary

  async getSummary() {
    const cacheKey = 'financeapp:dashboard:summary';
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const result = await this.computeSummary();
    await this.redis.set(cacheKey, JSON.stringify(result), 300);
    return result;
  }

  private async computeSummary() {
    const [incomeAgg, expenseAgg, totalCount] = await Promise.all([
      this.prisma.financialRecord.aggregate({
        where: { isDeleted: false, type: 'INCOME' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.financialRecord.aggregate({
        where: { isDeleted: false, type: 'EXPENSE' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.financialRecord.count({ where: { isDeleted: false } }),
    ]);

    const totalIncome = incomeAgg._sum.amount?.toString() || '0';
    const totalExpenses = expenseAgg._sum.amount?.toString() || '0';
    const netBalance = (
      parseFloat(totalIncome) - parseFloat(totalExpenses)
    ).toFixed(2);

    return {
      totalIncome,
      totalExpenses,
      netBalance,
      recordCount: totalCount,
      incomeRecordCount: incomeAgg._count,
      expenseRecordCount: expenseAgg._count,
    };
  }

  // Category Breakdown

  async getCategoryBreakdown() {
    const cacheKey = 'financeapp:dashboard:by-category';
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const result = await this.computeCategoryBreakdown();
    await this.redis.set(cacheKey, JSON.stringify(result), 300);
    return result;
  }

  private async computeCategoryBreakdown() {
    const records = await this.prisma.financialRecord.groupBy({
      by: ['category', 'type'],
      where: { isDeleted: false },
      _sum: { amount: true },
      _count: true,
    });

    // Merge income/expense by category
    const categoryMap = new Map<string, any>();

    for (const r of records) {
      const key = r.category;
      if (!categoryMap.has(key)) {
        categoryMap.set(key, {
          category: key,
          totalIncome: '0',
          totalExpense: '0',
          recordCount: 0,
        });
      }
      const entry = categoryMap.get(key);
      entry.recordCount += r._count;
      if (r.type === 'INCOME') {
        entry.totalIncome = (r._sum.amount || 0).toString();
      } else {
        entry.totalExpense = (r._sum.amount || 0).toString();
      }
    }

    const result = Array.from(categoryMap.values()).map((entry) => ({
      ...entry,
      netAmount: (
        parseFloat(entry.totalIncome) - parseFloat(entry.totalExpense)
      ).toFixed(2),
    }));

    // Sort by total volume descending
    result.sort(
      (a, b) =>
        parseFloat(b.totalIncome) +
        parseFloat(b.totalExpense) -
        (parseFloat(a.totalIncome) + parseFloat(a.totalExpense)),
    );

    return result;
  }

  // Monthly Trend

  async getMonthlyTrend(months: number = 12) {
    const cacheKey = `financeapp:dashboard:monthly-trend:${months}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const result = await this.computeMonthlyTrend(months);
    await this.redis.set(cacheKey, JSON.stringify(result), 300);
    return result;
  }

  private async computeMonthlyTrend(months: number) {
    const rows: any[] = await this.prisma.$queryRaw`
      SELECT
        TO_CHAR(date, 'YYYY-MM') AS month,
        SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END) AS income,
        SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END) AS expense,
        SUM(CASE WHEN type = 'INCOME' THEN amount ELSE -amount END) AS net
      FROM financial_records
      WHERE is_deleted = false
        AND date >= DATE_TRUNC('month', NOW() - CAST(${months - 1} || ' months' AS INTERVAL))
      GROUP BY TO_CHAR(date, 'YYYY-MM')
      ORDER BY month ASC
    `;

    return rows.map((r) => ({
      month: r.month,
      income: r.income?.toString() || '0',
      expense: r.expense?.toString() || '0',
      net: r.net?.toString() || '0',
    }));
  }

  // Weekly Trend

  async getWeeklyTrend(weeks: number = 8) {
    const cacheKey = `financeapp:dashboard:weekly-trend:${weeks}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const result = await this.computeWeeklyTrend(weeks);
    await this.redis.set(cacheKey, JSON.stringify(result), 300);
    return result;
  }

  private async computeWeeklyTrend(weeks: number) {
    const rows: any[] = await this.prisma.$queryRaw`
      SELECT
        TO_CHAR(date, 'IYYY-IW') AS week,
        SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END) AS income,
        SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END) AS expense,
        SUM(CASE WHEN type = 'INCOME' THEN amount ELSE -amount END) AS net
      FROM financial_records
      WHERE is_deleted = false
        AND date >= NOW() - CAST(${weeks} || ' weeks' AS INTERVAL)
      GROUP BY TO_CHAR(date, 'IYYY-IW')
      ORDER BY week ASC
    `;

    return rows.map((r) => ({
      week: r.week,
      income: r.income?.toString() || '0',
      expense: r.expense?.toString() || '0',
      net: r.net?.toString() || '0',
    }));
  }

  // Recent Activity

  async getRecentActivity(limit: number = 10) {
    const cacheKey = `financeapp:dashboard:recent-activity:${limit}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const records = await this.prisma.financialRecord.findMany({
      where: { isDeleted: false },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      include: {
        createdBy: { select: { id: true, fullName: true } },
      },
    });

    const result = records.map((r) => ({
      id: r.id,
      amount: r.amount.toString(),
      type: r.type,
      category: r.category,
      date: r.date.toISOString(),
      description: r.description,
      createdBy: r.createdBy,
    }));

    await this.redis.set(cacheKey, JSON.stringify(result), 120);
    return result;
  }

  // Top Categories

  async getTopCategories(limit: number = 5) {
    const cacheKey = `financeapp:dashboard:top-categories:${limit}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const categories = await this.prisma.financialRecord.groupBy({
      by: ['category'],
      where: { isDeleted: false, type: 'EXPENSE' },
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: 'desc' } },
      take: limit,
    });

    const result = categories.map((c) => ({
      category: c.category,
      totalSpend: c._sum.amount?.toString() || '0',
      recordCount: c._count,
    }));

    await this.redis.set(cacheKey, JSON.stringify(result), 300);
    return result;
  }

  // Balance Over Time

  async getBalanceOverTime() {
    const cacheKey = 'financeapp:dashboard:balance-over-time';
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const rows: any[] = await this.prisma.$queryRaw`
      SELECT
        month,
        net,
        SUM(net) OVER (ORDER BY month ASC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_balance
      FROM (
        SELECT
          TO_CHAR(date, 'YYYY-MM') AS month,
          SUM(CASE WHEN type = 'INCOME' THEN amount ELSE -amount END) AS net
        FROM financial_records
        WHERE is_deleted = false
        GROUP BY TO_CHAR(date, 'YYYY-MM')
      ) sub
      ORDER BY month ASC
    `;

    const result = rows.map((r) => ({
      month: r.month,
      net: r.net?.toString() || '0',
      runningBalance: r.running_balance?.toString() || '0',
    }));

    await this.redis.set(cacheKey, JSON.stringify(result), 300);
    return result;
  }

  // Income vs Expense

  async getIncomeVsExpense(period: 'month' | 'quarter' | 'year' = 'month') {
    const cacheKey = `financeapp:dashboard:income-vs-expense:${period}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const now = new Date();
    let currentStart: Date;
    let previousStart: Date;
    let previousEnd: Date;
    let currentLabel: string;
    let previousLabel: string;

    if (period === 'month') {
      currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
      previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      previousEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      currentLabel = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      previousLabel = `${previousStart.getFullYear()}-${String(previousStart.getMonth() + 1).padStart(2, '0')}`;
    } else if (period === 'quarter') {
      const currentQ = Math.floor(now.getMonth() / 3);
      currentStart = new Date(now.getFullYear(), currentQ * 3, 1);
      previousStart = new Date(now.getFullYear(), (currentQ - 1) * 3, 1);
      previousEnd = new Date(now.getFullYear(), currentQ * 3, 0);
      currentLabel = `${now.getFullYear()}-Q${currentQ + 1}`;
      previousLabel = `${previousStart.getFullYear()}-Q${Math.floor(previousStart.getMonth() / 3) + 1}`;
    } else {
      currentStart = new Date(now.getFullYear(), 0, 1);
      previousStart = new Date(now.getFullYear() - 1, 0, 1);
      previousEnd = new Date(now.getFullYear() - 1, 11, 31);
      currentLabel = `${now.getFullYear()}`;
      previousLabel = `${now.getFullYear() - 1}`;
    }

    const [currentData, previousData] = await Promise.all([
      this.getPeriodicData(currentStart, now),
      this.getPeriodicData(previousStart, previousEnd),
    ]);

    const changes = {
      incomeChangePercent: this.calcPercentChange(
        parseFloat(previousData.income),
        parseFloat(currentData.income),
      ),
      expenseChangePercent: this.calcPercentChange(
        parseFloat(previousData.expense),
        parseFloat(currentData.expense),
      ),
      netChangePercent: this.calcPercentChange(
        parseFloat(previousData.net),
        parseFloat(currentData.net),
      ),
    };

    const result = {
      current: { period: currentLabel, ...currentData },
      previous: { period: previousLabel, ...previousData },
      changes,
    };

    await this.redis.set(cacheKey, JSON.stringify(result), 300);
    return result;
  }

  private async getPeriodicData(start: Date, end: Date) {
    const [incomeAgg, expenseAgg] = await Promise.all([
      this.prisma.financialRecord.aggregate({
        where: {
          isDeleted: false,
          type: 'INCOME',
          date: { gte: start, lte: end },
        },
        _sum: { amount: true },
      }),
      this.prisma.financialRecord.aggregate({
        where: {
          isDeleted: false,
          type: 'EXPENSE',
          date: { gte: start, lte: end },
        },
        _sum: { amount: true },
      }),
    ]);

    const income = incomeAgg._sum.amount?.toString() || '0';
    const expense = expenseAgg._sum.amount?.toString() || '0';
    const net = (parseFloat(income) - parseFloat(expense)).toFixed(2);

    return { income, expense, net };
  }

  private calcPercentChange(
    previous: number,
    current: number,
  ): number | null {
    if (previous === 0) return null;
    return parseFloat(
      (((current - previous) / Math.abs(previous)) * 100).toFixed(2),
    );
  }
}
