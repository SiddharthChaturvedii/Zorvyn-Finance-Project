import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RecordsModule } from './records/records.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AuditModule } from './audit/audit.module';
import { AppController } from './app.controller';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';

@Module({
  controllers: [AppController],
  imports: [
    // Environment config — loaded globally
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Rate limiting — global default
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.GLOBAL_RATE_LIMIT_TTL || '60000'),
        limit: parseInt(process.env.GLOBAL_RATE_LIMIT_MAX || '100'),
      },
    ]),

    // Database
    PrismaModule,

    // Domain modules
    AuthModule,
    UsersModule,
    RecordsModule,
    DashboardModule,
    AuditModule,
  ],
  providers: [
    // Apply throttler globally
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
