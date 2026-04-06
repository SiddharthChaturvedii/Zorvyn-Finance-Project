import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix - excluding root (/) to serve the Welcome Gateway directly
  app.setGlobalPrefix('api/v1', {
    exclude: ['/'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // CORS - Defensively handle trailing slashes and whitespace for production reliability
  app.enableCors({
    origin: (process.env.ALLOWED_ORIGINS?.split(',') || ['*']).map(origin => origin.trim().replace(/\/$/, '')),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Swagger docs
  const config = new DocumentBuilder()
    .setTitle('Zorvyn Finance Dashboard API')
    .setDescription(
      'Production-grade REST API backend for the Zorvyn FinTech Finance Dashboard System. ' +
      'Manages users with role-based access control, financial records with soft delete, ' +
      'and serves aggregated analytics for dashboard consumption.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth', 'Authentication & token management')
    .addTag('Users', 'User management (Admin only)')
    .addTag('Records', 'Financial records CRUD')
    .addTag('Dashboard', 'Analytics & aggregated data')
    .addTag('Audit', 'Audit trail (Admin only)')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Finance API running on http://localhost:${port}`);
  console.log(`📚 Swagger docs at http://localhost:${port}/docs`);
}
bootstrap();
