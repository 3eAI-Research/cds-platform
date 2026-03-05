import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { createTestApp, cleanTestData } from './setup';

/**
 * Critical Path Integration Test
 *
 * Tests the full MVP happy path:
 *   Provider Register → Demand Create → Offer Submit → Offer Accept
 *   → Contract Auto-Create → Customer Accept → Provider Accept → ACTIVE
 *
 * Uses real DB, real event handlers, real business logic.
 */
describe('Critical Path: Demand → Offer → Contract (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Test data IDs (populated during test)
  let estateTypeId: string;
  let partTypeId: string;
  let furnitureTypeId: string;
  let providerId: string;
  let demandId: string;
  let offerId: string;
  let contractId: string;

  beforeAll(async () => {
    const setup = await createTestApp();
    app = setup.app;
    prisma = setup.prisma;
  }, 30000);

  afterAll(async () => {
    await cleanTestData(prisma);
    await app.close();
  });

  // --- Step 0: Fetch seed data ---

  it('should fetch estate types from seed data', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/estate-types')
      .expect(200);

    expect(res.body.data.items.length).toBeGreaterThan(0);
    estateTypeId = res.body.data.items[0].id;
  });

  it('should fetch parts for estate type', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/estate-types/${estateTypeId}/parts`)
      .expect(200);

    expect(res.body.data.parts.length).toBeGreaterThan(0);
    partTypeId = res.body.data.parts[0].id;
  });

  it('should fetch furniture types from seed data', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/furniture-types')
      .expect(200);

    expect(res.body.data.items.length).toBeGreaterThan(0);
    furnitureTypeId = res.body.data.items[0].id;
  });

  // --- Step 1: Register provider company ---

  it('should register a provider company', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/providers')
      .send({
        name: 'Test Umzug GmbH',
        email: 'test@umzug.de',
        phoneNumber: '+49301234567',
        taxNumber: 'DE999888777',
        supportedPostCodePrefixes: ['10', '12'],
        address: {
          street: 'Teststraße',
          houseNumber: '1',
          postCode: '10115',
          placeName: 'Berlin',
        },
      })
      .expect(201);

    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.status).toBe('PENDING');
    providerId = res.body.data.id;
  });

  // --- Step 2: Create demand ---

  it('should create a demand with full nested payload', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/demands')
      .send({
        serviceType: 'PRIVATE_MOVE',
        transportType: 'LOCAL',
        numberOfPeople: 2,
        preferredDateStart: '2026-04-01T08:00:00Z',
        preferredDateEnd: '2026-04-01T18:00:00Z',
        from: {
          address: {
            street: 'Alexanderplatz',
            houseNumber: '1',
            postCode: '10178',
            placeName: 'Berlin',
          },
          estate: {
            estateTypeId,
            totalSquareMeters: 65,
            numberOfRooms: 3,
            parts: [
              {
                estatePartTypeId: partTypeId,
                furnitureItems: [
                  { furnitureTypeId, quantity: 2 },
                ],
              },
            ],
          },
        },
        to: {
          address: {
            street: 'Kurfürstendamm',
            houseNumber: '100',
            postCode: '10709',
            placeName: 'Berlin',
          },
          estate: {
            estateTypeId,
            totalSquareMeters: 80,
            numberOfRooms: 4,
            parts: [
              {
                estatePartTypeId: partTypeId,
                furnitureItems: [
                  { furnitureTypeId, quantity: 1 },
                ],
              },
            ],
          },
        },
      })
      .expect(201);

    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.status).toBe('PUBLISHED');
    demandId = res.body.data.id;
  });

  // --- Step 3: Submit offer ---

  it('should submit an offer for the demand', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/offers')
      .send({
        demandId,
        providerCompanyId: providerId,
        totalPriceAmount: 85000, // 850 EUR
        message: 'Integration test offer',
        validUntil: '2026-03-20T23:59:59Z',
      })
      .expect(201);

    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.status).toBe('SUBMITTED');
    expect(res.body.data.commissionRate).toBe(0.04);
    expect(res.body.data.commissionAmount).toBe(3400); // 4% of 85000
    expect(res.body.data.providerNetAmount).toBe(81600); // 85000 - 3400
    offerId = res.body.data.id;
  });

  it('should have transitioned demand to OFFERED status', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/demands/${demandId}`)
      .expect(200);

    expect(res.body.data.status).toBe('OFFERED');
    expect(res.body.data.offerCount).toBe(1);
  });

  // --- Step 4: Accept offer ---

  it('should accept the offer', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/offers/${offerId}/accept`)
      .expect(200);

    expect(res.body.data.status).toBe('ACCEPTED');
  });

  it('should have transitioned demand to ACCEPTED status', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/demands/${demandId}`)
      .expect(200);

    expect(res.body.data.status).toBe('ACCEPTED');
  });

  // --- Step 5: Verify auto-created contract ---

  it('should have auto-created a DRAFT contract via event', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/contracts')
      .expect(200);

    const contracts = res.body.data.items;
    expect(contracts.length).toBeGreaterThan(0);

    const contract = contracts.find(
      (c: { offerId: string }) => c.offerId === offerId,
    );
    expect(contract).toBeDefined();
    expect(contract.status).toBe('DRAFT');
    expect(contract.agreedPriceAmount).toBe(85000);
    contractId = contract.id;
  });

  // --- Step 6: Customer accepts contract ---

  it('should allow customer to accept contract', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/contracts/${contractId}/customer-accept`)
      .expect(200);

    expect(res.body.data.status).toBe('PENDING_PROVIDER');
    expect(res.body.data.customerAcceptedAt).toBeDefined();
  });

  // --- Step 7: Provider accepts contract → ACTIVE ---

  it('should allow provider to accept contract → ACTIVE', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/contracts/${contractId}/provider-accept`)
      .expect(200);

    expect(res.body.data.status).toBe('ACTIVE');
    expect(res.body.data.providerAcceptedAt).toBeDefined();
  });

  // --- Step 8: Verify final state ---

  it('should have notifications created for key events', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/notifications')
      .expect(200);

    // At minimum: DEMAND_PUBLISHED + OFFER_ACCEPTED + CONTRACT_ACTIVE
    expect(res.body.data.total).toBeGreaterThanOrEqual(3);
  });
});

/**
 * Error Path Tests
 */
describe('Error Paths', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const setup = await createTestApp();
    app = setup.app;
    prisma = setup.prisma;
  }, 30000);

  afterAll(async () => {
    await cleanTestData(prisma);
    await app.close();
  });

  it('should reject invalid UUID in path', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/demands/not-a-uuid')
      .expect(400);
  });

  it('should return 404 for non-existent demand', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/demands/00000000-0000-0000-0000-000000000099')
      .expect(404);
  });

  it('should reject demand with missing required fields', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/demands')
      .send({ serviceType: 'PRIVATE_MOVE' }) // missing most fields
      .expect(400);

    expect(res.body.message).toBeDefined();
  });

  it('should reject offer with invalid demandId', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/offers')
      .send({
        demandId: '00000000-0000-0000-0000-000000000099',
        providerCompanyId: '00000000-0000-0000-0000-000000000099',
        totalPriceAmount: 50000,
        validUntil: '2026-03-20T23:59:59Z',
      })
      .expect(404);
  });

  it('should reject invalid post code format', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/post-codes/abc')
      .expect(400);
  });
});
