import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Global prefix: /api/v1
  app.setGlobalPrefix('api/v1');

  // Global validation pipe (class-validator)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip unknown properties
      forbidNonWhitelisted: true, // Throw on unknown properties
      transform: true, // Auto-transform payloads to DTO types
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger/OpenAPI documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('CDS Platform API')
    .setDescription(
      'Community Driven Services — Low-commission moving service marketplace (Germany)',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'keycloak-jwt',
    )
    .addTag('transport', 'Estate types, furniture, post codes, volume estimation')
    .addTag('demands', 'Moving demand (Umzugsanfrage) management')
    .addTag('offers', 'Provider offers for demands')
    .addTag('contracts', 'Digital service contracts (Dienstleistungsvertrag)')
    .addTag('providers', 'Moving company registration and management')
    .addTag('payments', 'Payment transactions and deposit management')
    .addTag('reviews', 'Bi-directional rating system (Bewertung)')
    .addTag('notifications', 'In-app notification management')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  // CORS — allow frontend dev server
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3001',
    credentials: true,
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`CDS Platform running on http://localhost:${port}/api/v1`);
  logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
