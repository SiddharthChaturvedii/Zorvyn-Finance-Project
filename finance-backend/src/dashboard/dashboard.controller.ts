import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Overall financial summary' })
  async getSummary() {
    return this.dashboardService.getSummary();
  }

  @Get('by-category')
  @ApiOperation({ summary: 'Income and expense breakdown by category' })
  async getCategoryBreakdown() {
    return this.dashboardService.getCategoryBreakdown();
  }

  @Get('monthly-trend')
  @ApiOperation({ summary: 'Monthly income/expense trends' })
  @ApiQuery({ name: 'months', required: false, type: Number, description: 'Number of months (default 12)' })
  async getMonthlyTrend(@Query('months') months?: number) {
    return this.dashboardService.getMonthlyTrend(months || 12);
  }

  @Get('weekly-trend')
  @ApiOperation({ summary: 'Weekly income/expense trends' })
  @ApiQuery({ name: 'weeks', required: false, type: Number, description: 'Number of weeks (default 8)' })
  async getWeeklyTrend(@Query('weeks') weeks?: number) {
    return this.dashboardService.getWeeklyTrend(weeks || 8);
  }

  @Get('recent-activity')
  @ApiOperation({ summary: 'Most recent transactions' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of records (default 10)' })
  async getRecentActivity(@Query('limit') limit?: number) {
    return this.dashboardService.getRecentActivity(limit || 10);
  }

  @Get('top-categories')
  @ApiOperation({ summary: 'Top spending categories' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of categories (default 5)' })
  async getTopCategories(@Query('limit') limit?: number) {
    return this.dashboardService.getTopCategories(limit || 5);
  }

  @Get('balance-over-time')
  @ApiOperation({ summary: 'Running net balance by month' })
  async getBalanceOverTime() {
    return this.dashboardService.getBalanceOverTime();
  }

  @Get('income-vs-expense')
  @ApiOperation({ summary: 'Income vs expense comparison with period change %' })
  @ApiQuery({ name: 'period', required: false, enum: ['month', 'quarter', 'year'], description: 'Comparison period' })
  async getIncomeVsExpense(
    @Query('period') period?: 'month' | 'quarter' | 'year',
  ) {
    return this.dashboardService.getIncomeVsExpense(period || 'month');
  }
}
