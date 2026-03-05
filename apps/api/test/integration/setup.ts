import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

/**
 * Integration test setup — creates a real NestJS app with real Prisma connection.
 *
 * Uses the test database (DATABASE_URL from .env or test env).
 * Each test suite should clean up its own data.
 */
export async function createTestApp(): Promise<{
  app: INestApplication;
  prisma: PrismaService;
}> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  await app.init();

  const prisma = app.get(PrismaService);

  return { app, prisma };
}

/**
 * Clean up test data from all schemas.
 * Order matters due to cross-schema references (logical, no FK).
 */
export async function cleanTestData(prisma: PrismaService): Promise<void> {
  // Delete in reverse dependency order
  await prisma.notification.deleteMany({});
  await prisma.reviewAggregate.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.paymentTransaction.deleteMany({});
  await prisma.contract.deleteMany({});
  await prisma.offer.deleteMany({});
  await prisma.demand.deleteMany({});
  await prisma.transportation.deleteMany({});
  await prisma.estatePart.deleteMany({});
  await prisma.estate.deleteMany({});
  await prisma.address.deleteMany({});
  await prisma.providerEmployee.deleteMany({});
  await prisma.providerAddress.deleteMany({});
  await prisma.providerCompany.deleteMany({});

  // Clean processed events tables
  await prisma.demandProcessedEvent.deleteMany({});
  await prisma.offerProcessedEvent.deleteMany({});
  await prisma.contractProcessedEvent.deleteMany({});
  await prisma.notificationProcessedEvent.deleteMany({});
  await prisma.paymentProcessedEvent.deleteMany({});
  await prisma.reviewProcessedEvent.deleteMany({});
}
