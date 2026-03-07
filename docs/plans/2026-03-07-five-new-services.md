# Five New Services Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 5 new services to CDS Platform: WebSocket Gateway, File Storage (MinIO), Invoice Service, Customer-Provider Chat, and Provider Analytics Dashboard.

**Architecture:** Each service follows existing NestJS module pattern (Module→Controller→Service→DTO) with Prisma multi-schema. Frontend uses Refine + Ant Design. Real-time via Socket.IO, storage via MinIO S3 client, charts via Recharts.

**Tech Stack:** NestJS 10, Socket.IO (`@nestjs/websockets` + `@nestjs/platform-socket.io`), MinIO (`minio`), Recharts, PDFKit (reuse), Prisma 6, React 18 + Ant Design 5.

---

## Service 1: WebSocket Gateway (Real-time Notifications)

### Task 1: Install WebSocket dependencies

**Files:**
- Modify: `apps/api/package.json`
- Modify: `apps/web/package.json`

**Step 1: Install backend packages**

```bash
cd apps/api && npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
```

**Step 2: Install frontend package**

```bash
cd apps/web && npm install socket.io-client
```

**Step 3: Commit**

```bash
git add apps/api/package.json apps/api/package-lock.json apps/web/package.json apps/web/package-lock.json
git commit -m "feat: add Socket.IO dependencies for real-time gateway"
```

---

### Task 2: Create WebSocket Gateway module (backend)

**Files:**
- Create: `apps/api/src/modules/realtime/realtime.module.ts`
- Create: `apps/api/src/modules/realtime/realtime.gateway.ts`
- Create: `apps/api/src/modules/realtime/realtime.service.ts`
- Modify: `apps/api/src/app.module.ts`

**Step 1: Create RealtimeGateway**

`apps/api/src/modules/realtime/realtime.gateway.ts`:

```typescript
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/ws',
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);
  private readonly userSockets = new Map<string, Set<string>>();

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (!userId) {
      client.disconnect();
      return;
    }

    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(client.id);
    client.join(`user:${userId}`);
    this.logger.log(`Client connected: ${client.id} (user: ${userId})`);
  }

  handleDisconnect(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (userId && this.userSockets.has(userId)) {
      this.userSockets.get(userId)!.delete(client.id);
      if (this.userSockets.get(userId)!.size === 0) {
        this.userSockets.delete(userId);
      }
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('ping')
  handlePing(): string {
    return 'pong';
  }

  /**
   * Send event to a specific user (all their connected sockets).
   */
  sendToUser(userId: string, event: string, data: unknown) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Broadcast to all connected clients.
   */
  broadcast(event: string, data: unknown) {
    this.server.emit(event, data);
  }

  /**
   * Get count of online users.
   */
  getOnlineUserCount(): number {
    return this.userSockets.size;
  }

  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }
}
```

**Step 2: Create RealtimeService**

`apps/api/src/modules/realtime/realtime.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';

export interface RealtimeEvent {
  type: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

@Injectable()
export class RealtimeService {
  constructor(private readonly gateway: RealtimeGateway) {}

  notifyUser(userId: string, type: string, payload: Record<string, unknown>) {
    const event: RealtimeEvent = {
      type,
      payload,
      timestamp: new Date().toISOString(),
    };
    this.gateway.sendToUser(userId, 'notification', event);
  }

  notifyNewOffer(customerUserId: string, offerId: string, demandId: string, providerName: string) {
    this.notifyUser(customerUserId, 'OFFER_RECEIVED', {
      offerId,
      demandId,
      providerName,
    });
  }

  notifyContractUpdate(userId: string, contractId: string, status: string) {
    this.notifyUser(userId, 'CONTRACT_UPDATED', { contractId, status });
  }

  notifyPaymentComplete(userId: string, paymentId: string, amount: number) {
    this.notifyUser(userId, 'PAYMENT_COMPLETED', { paymentId, amount });
  }

  notifyNewMessage(userId: string, channelId: string, senderName: string, preview: string) {
    this.notifyUser(userId, 'NEW_MESSAGE', { channelId, senderName, preview });
  }

  broadcastDemandPublished(demandId: string, serviceType: string, fromCity: string, toCity: string) {
    this.gateway.broadcast('demand:published', {
      demandId,
      serviceType,
      fromCity,
      toCity,
      timestamp: new Date().toISOString(),
    });
  }

  getOnlineUserCount(): number {
    return this.gateway.getOnlineUserCount();
  }

  isUserOnline(userId: string): boolean {
    return this.gateway.isUserOnline(userId);
  }
}
```

**Step 3: Create RealtimeModule**

`apps/api/src/modules/realtime/realtime.module.ts`:

```typescript
import { Module, Global } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';

@Global()
@Module({
  providers: [RealtimeGateway, RealtimeService],
  exports: [RealtimeService],
})
export class RealtimeModule {}
```

**Step 4: Add to AppModule**

Add import to `apps/api/src/app.module.ts`:

```typescript
import { RealtimeModule } from './modules/realtime/realtime.module';
// Add RealtimeModule to imports array
```

**Step 5: Commit**

```bash
git add apps/api/src/modules/realtime/ apps/api/src/app.module.ts
git commit -m "feat: add WebSocket gateway with Socket.IO for real-time events"
```

---

### Task 3: Wire events to WebSocket (backend)

**Files:**
- Modify: `apps/api/src/events/events.module.ts`
- Create: `apps/api/src/events/realtime-event.handler.ts`

**Step 1: Create event handler that bridges domain events → WebSocket**

`apps/api/src/events/realtime-event.handler.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { RealtimeService } from '../modules/realtime/realtime.service';

@Injectable()
export class RealtimeEventHandler {
  constructor(private readonly realtime: RealtimeService) {}

  @OnEvent('demand.published')
  handleDemandPublished(event: {
    payload: { demandId: string; serviceType: string; fromCity?: string; toCity?: string };
  }) {
    const { demandId, serviceType, fromCity, toCity } = event.payload;
    this.realtime.broadcastDemandPublished(
      demandId,
      serviceType,
      fromCity ?? '',
      toCity ?? '',
    );
  }

  @OnEvent('offer.submitted')
  handleOfferSubmitted(event: {
    payload: { offerId: string; demandId: string; customerUserId: string; providerName: string };
  }) {
    const { offerId, demandId, customerUserId, providerName } = event.payload;
    this.realtime.notifyNewOffer(customerUserId, offerId, demandId, providerName);
  }

  @OnEvent('contract.status_changed')
  handleContractStatusChanged(event: {
    payload: { contractId: string; status: string; customerUserId: string; providerUserId: string };
  }) {
    const { contractId, status, customerUserId, providerUserId } = event.payload;
    this.realtime.notifyContractUpdate(customerUserId, contractId, status);
    this.realtime.notifyContractUpdate(providerUserId, contractId, status);
  }

  @OnEvent('payment.completed')
  handlePaymentCompleted(event: {
    payload: { paymentId: string; userId: string; amount: number };
  }) {
    const { paymentId, userId, amount } = event.payload;
    this.realtime.notifyPaymentComplete(userId, paymentId, amount);
  }
}
```

**Step 2: Register handler in EventsModule**

Add `RealtimeEventHandler` to providers in `apps/api/src/events/events.module.ts`.

**Step 3: Commit**

```bash
git add apps/api/src/events/
git commit -m "feat: bridge domain events to WebSocket real-time notifications"
```

---

### Task 4: Create frontend useSocket hook + integrate

**Files:**
- Create: `apps/web/src/hooks/useSocket.ts`
- Modify: `apps/web/src/components/notification-bell.tsx`

**Step 1: Create useSocket hook**

`apps/web/src/hooks/useSocket.ts`:

```typescript
import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface RealtimeEvent {
  type: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

type EventHandler = (event: RealtimeEvent) => void;

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const handlersRef = useRef<Map<string, Set<EventHandler>>>(new Map());

  useEffect(() => {
    const userId =
      localStorage.getItem('cds-role') === 'admin'
        ? '00000000-0000-0000-0000-000000000003'
        : localStorage.getItem('cds-role') === 'provider'
          ? '00000000-0000-0000-0000-000000000002'
          : '00000000-0000-0000-0000-000000000001';

    const socket = io('/ws', {
      query: { userId },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('notification', (event: RealtimeEvent) => {
      const handlers = handlersRef.current.get(event.type);
      if (handlers) {
        handlers.forEach((h) => h(event));
      }
      // Also fire wildcard handlers
      const wildcardHandlers = handlersRef.current.get('*');
      if (wildcardHandlers) {
        wildcardHandlers.forEach((h) => h(event));
      }
    });

    socket.on('demand:published', (data: unknown) => {
      const handlers = handlersRef.current.get('demand:published');
      if (handlers) {
        handlers.forEach((h) =>
          h({ type: 'DEMAND_PUBLISHED', payload: data as Record<string, unknown>, timestamp: new Date().toISOString() }),
        );
      }
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const on = useCallback((eventType: string, handler: EventHandler) => {
    if (!handlersRef.current.has(eventType)) {
      handlersRef.current.set(eventType, new Set());
    }
    handlersRef.current.get(eventType)!.add(handler);

    return () => {
      handlersRef.current.get(eventType)?.delete(handler);
    };
  }, []);

  return { connected, on, socket: socketRef };
}
```

**Step 2: Integrate with NotificationBell**

Read existing `apps/web/src/components/notification-bell.tsx` and add:
- Import `useSocket`
- On `*` events, increment unread badge count
- Show toast/message.info for incoming real-time notifications

**Step 3: Commit**

```bash
git add apps/web/src/hooks/useSocket.ts apps/web/src/components/notification-bell.tsx
git commit -m "feat: add useSocket hook and real-time notification integration"
```

---

### Task 5: TypeScript check + verify

**Step 1: Run tsc on both apps**

```bash
cd apps/api && npx tsc --noEmit
cd apps/web && npx tsc --noEmit
```

**Step 2: Commit if fixes needed**

```bash
git add -A
git commit -m "fix: TypeScript fixes for WebSocket service"
```

---

## Service 2: File Storage (MinIO/S3)

### Task 6: Add MinIO to Docker + install SDK

**Files:**
- Modify: `docker/docker-compose.yml`
- Modify: `apps/api/package.json`
- Modify: `apps/api/.env.example`
- Modify: `apps/api/.env`

**Step 1: Uncomment MinIO in docker-compose.yml and add**

```yaml
  minio:
    image: minio/minio:latest
    container_name: cds-minio
    restart: unless-stopped
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 5s
      timeout: 5s
      retries: 5
```

Uncomment `minio_data:` in volumes.

**Step 2: Install MinIO SDK**

```bash
cd apps/api && npm install minio
```

**Step 3: Add env variables**

```env
# MinIO / S3
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_USE_SSL=false
MINIO_BUCKET=cds-uploads
```

**Step 4: Commit**

```bash
git add docker/docker-compose.yml apps/api/package.json apps/api/.env.example
git commit -m "feat: add MinIO to Docker and install SDK"
```

---

### Task 7: Create StorageModule (backend)

**Files:**
- Create: `apps/api/src/modules/storage/storage.module.ts`
- Create: `apps/api/src/modules/storage/storage.service.ts`
- Create: `apps/api/src/modules/storage/storage.controller.ts`
- Create: `apps/api/src/modules/storage/dto/storage.dto.ts`
- Modify: `apps/api/src/app.module.ts`

**Step 1: Create StorageService**

`apps/api/src/modules/storage/storage.service.ts`:

```typescript
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import * as crypto from 'crypto';

export interface UploadResult {
  key: string;
  url: string;
  bucket: string;
  size: number;
  contentType: string;
}

@Injectable()
export class StorageService implements OnModuleInit {
  private client!: Minio.Client;
  private bucket!: string;
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    this.bucket = this.config.get<string>('MINIO_BUCKET', 'cds-uploads');
    this.client = new Minio.Client({
      endPoint: this.config.get<string>('MINIO_ENDPOINT', 'localhost'),
      port: Number(this.config.get<string>('MINIO_PORT', '9000')),
      useSSL: this.config.get<string>('MINIO_USE_SSL', 'false') === 'true',
      accessKey: this.config.get<string>('MINIO_ACCESS_KEY', 'minioadmin'),
      secretKey: this.config.get<string>('MINIO_SECRET_KEY', 'minioadmin'),
    });

    const exists = await this.client.bucketExists(this.bucket);
    if (!exists) {
      await this.client.makeBucket(this.bucket);
      this.logger.log(`Created bucket: ${this.bucket}`);
    }
    this.logger.log(`Storage connected: ${this.bucket}`);
  }

  /**
   * Upload a file buffer to MinIO.
   * Returns the storage key and a pre-signed download URL.
   */
  async upload(
    buffer: Buffer,
    originalName: string,
    contentType: string,
    folder: string = 'general',
  ): Promise<UploadResult> {
    const ext = originalName.split('.').pop() ?? 'bin';
    const key = `${folder}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

    await this.client.putObject(this.bucket, key, buffer, buffer.length, {
      'Content-Type': contentType,
      'X-Original-Name': originalName,
    });

    const url = await this.client.presignedGetObject(this.bucket, key, 7 * 24 * 3600); // 7 days

    this.logger.log(`Uploaded: ${key} (${buffer.length} bytes)`);

    return {
      key,
      url,
      bucket: this.bucket,
      size: buffer.length,
      contentType,
    };
  }

  /**
   * Get a pre-signed download URL for an existing file.
   */
  async getDownloadUrl(key: string, expirySeconds: number = 3600): Promise<string> {
    return this.client.presignedGetObject(this.bucket, key, expirySeconds);
  }

  /**
   * Delete a file from storage.
   */
  async delete(key: string): Promise<void> {
    await this.client.removeObject(this.bucket, key);
    this.logger.log(`Deleted: ${key}`);
  }
}
```

**Step 2: Create StorageController**

`apps/api/src/modules/storage/storage.controller.ts`:

```typescript
import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { StorageService } from './storage.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/types/error-codes';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const ALLOWED_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

@ApiTags('Storage')
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @ApiOperation({ summary: 'Upload a file' })
  @ApiConsumes('multipart/form-data')
  @Roles('customer', 'provider_owner', 'admin')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIMES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BusinessException(
              ErrorCode.BUS_PHOTO_INVALID_TYPE,
              `Invalid file type: ${file.mimetype}`,
              HttpStatus.BAD_REQUEST,
            ),
            false,
          );
        }
      },
    }),
  )
  @Post()
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder?: string,
  ) {
    if (!file) {
      throw new BusinessException(
        ErrorCode.VAL_REQUIRED_FIELD,
        'File is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.storageService.upload(
      file.buffer,
      file.originalname,
      file.mimetype,
      folder ?? 'general',
    );
  }

  @ApiOperation({ summary: 'Get download URL for a file' })
  @Roles('customer', 'provider_owner', 'admin')
  @Get('url')
  async getUrl(@Query('key') key: string) {
    if (!key) {
      throw new BusinessException(
        ErrorCode.VAL_REQUIRED_FIELD,
        'key query parameter is required',
        HttpStatus.BAD_REQUEST,
      );
    }
    const url = await this.storageService.getDownloadUrl(key);
    return { key, url };
  }

  @ApiOperation({ summary: 'Delete a file' })
  @Roles('admin')
  @Delete(':key(*)')
  async delete(@Param('key') key: string) {
    await this.storageService.delete(key);
    return { deleted: true, key };
  }
}
```

**Step 3: Create StorageModule**

`apps/api/src/modules/storage/storage.module.ts`:

```typescript
import { Module, Global } from '@nestjs/common';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';

@Global()
@Module({
  controllers: [StorageController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
```

**Step 4: Add to AppModule**

```typescript
import { StorageModule } from './modules/storage/storage.module';
// Add StorageModule to imports array
```

**Step 5: Commit**

```bash
git add apps/api/src/modules/storage/ apps/api/src/app.module.ts
git commit -m "feat: add StorageModule with MinIO S3 integration"
```

---

## Service 3: Invoice Service (PDF Invoices)

### Task 8: Create Prisma schema for invoices

**Files:**
- Create: `apps/api/prisma/invoice.prisma`
- Modify: `apps/api/prisma/schema.prisma` (add "invoice" to schemas)
- Modify: `docker/init-schemas.sql` (add invoice schema)

**Step 1: Create invoice.prisma**

```prisma
model Invoice {
  id                  String    @id @default(uuid()) @db.Uuid
  invoiceNumber       String    @unique @map("invoice_number")
  contractId          String    @map("contract_id") @db.Uuid
  demandId            String    @map("demand_id") @db.Uuid
  paymentId           String?   @map("payment_id") @db.Uuid
  customerUserId      String    @map("customer_user_id") @db.Uuid
  providerUserId      String    @map("provider_user_id") @db.Uuid
  providerCompanyId   String    @map("provider_company_id") @db.Uuid

  // Amounts (cents)
  subtotalAmount      Int       @map("subtotal_amount")
  vatRate             Int       @default(19) @map("vat_rate")
  vatAmount           Int       @map("vat_amount")
  commissionRate      Int       @default(4) @map("commission_rate")
  commissionAmount    Int       @map("commission_amount")
  totalAmount         Int       @map("total_amount")
  currency            String    @default("EUR") @map("currency") @db.VarChar(3)

  // Addresses (snapshot at invoice time)
  customerName        String    @map("customer_name")
  customerAddress     String?   @map("customer_address")
  providerName        String    @map("provider_name")
  providerAddress     String?   @map("provider_address")
  providerTaxId       String?   @map("provider_tax_id")

  // Service details
  serviceDescription  String    @map("service_description") @db.Text
  serviceDate         DateTime? @map("service_date") @db.Date

  // Storage
  pdfKey              String?   @map("pdf_key")
  status              String    @default("DRAFT") @map("status") // DRAFT | ISSUED | PAID | CANCELLED

  issuedAt            DateTime? @map("issued_at") @db.Timestamptz
  paidAt              DateTime? @map("paid_at") @db.Timestamptz
  createdAt           DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt           DateTime  @updatedAt @map("updated_at") @db.Timestamptz

  @@index([contractId])
  @@index([customerUserId])
  @@index([providerCompanyId])
  @@index([status])
  @@map("invoices")
  @@schema("invoice")
}
```

**Step 2: Add "invoice" to schema.prisma schemas array**

**Step 3: Add `CREATE SCHEMA IF NOT EXISTS invoice;` to docker/init-schemas.sql**

**Step 4: Run prisma db push**

```bash
cd apps/api && npx prisma db push
```

**Step 5: Commit**

```bash
git add apps/api/prisma/ docker/init-schemas.sql
git commit -m "feat: add invoice Prisma schema"
```

---

### Task 9: Create InvoiceModule (backend)

**Files:**
- Create: `apps/api/src/modules/invoice/invoice.module.ts`
- Create: `apps/api/src/modules/invoice/services/invoice.service.ts`
- Create: `apps/api/src/modules/invoice/services/invoice-pdf.service.ts`
- Create: `apps/api/src/modules/invoice/controllers/invoice.controller.ts`
- Create: `apps/api/src/modules/invoice/dto/invoice.dto.ts`
- Modify: `apps/api/src/app.module.ts`

**Step 1: Create InvoiceService**

`apps/api/src/modules/invoice/services/invoice.service.ts`:

Core methods:
- `generateInvoiceNumber()` — Format: `INV-YYYYMM-XXXXX` (sequential)
- `createFromContract(contractId, userId)` — Creates DRAFT invoice from contract data, calculates VAT (19%) + commission (4%)
- `issue(invoiceId)` — DRAFT → ISSUED, generates PDF via InvoicePdfService, uploads to MinIO via StorageService
- `markPaid(invoiceId)` — ISSUED → PAID
- `cancel(invoiceId)` — → CANCELLED
- `findById(id)` — Returns invoice with download URL
- `findByUser(userId, page, pageSize)` — Paginated list
- `findByContract(contractId)` — Returns invoice for a contract

**Step 2: Create InvoicePdfService**

`apps/api/src/modules/invoice/services/invoice-pdf.service.ts`:

Generates A4 PDF with:
- Header: CDS Platform logo text + invoice number + date
- From/To: Customer and provider details
- Service table: Description, quantity, unit price, total
- Subtotal, VAT (19%), Commission (4%), Total
- Footer: Payment terms, bank details placeholder
- Returns Buffer

Uses PDFKit (already installed).

**Step 3: Create InvoiceController**

```
POST   /api/v1/invoices                         → create from contract
POST   /api/v1/invoices/:id/issue               → issue + generate PDF
PATCH  /api/v1/invoices/:id/paid                → mark as paid
PATCH  /api/v1/invoices/:id/cancel              → cancel
GET    /api/v1/invoices                          → list (filter by status)
GET    /api/v1/invoices/:id                      → get by ID
GET    /api/v1/invoices/:id/download             → download PDF (redirect to pre-signed URL)
GET    /api/v1/invoices/admin/all                → admin: list all invoices
```

**Step 4: Create InvoiceModule, register in AppModule**

**Step 5: Commit**

```bash
git add apps/api/src/modules/invoice/ apps/api/src/app.module.ts
git commit -m "feat: add InvoiceModule with PDF generation and MinIO storage"
```

---

### Task 10: Add Invoice frontend pages

**Files:**
- Create: `apps/web/src/pages/invoices/list.tsx`
- Create: `apps/web/src/pages/invoices/show.tsx`
- Modify: `apps/web/src/App.tsx` (routes + resources)
- Modify: `apps/web/src/i18n/en.ts`, `de.ts`, `tr.ts`

**Step 1: Create invoice list page**

Table with: Invoice #, Contract, Amount, VAT, Status (tag), Date, Actions (view, download PDF).

**Step 2: Create invoice show page**

Detail view with all invoice fields + download PDF button.

**Step 3: Add routes and i18n keys**

Add `invoices` resource for customer/provider/admin roles. Add i18n keys for invoice-related labels.

**Step 4: Commit**

```bash
git add apps/web/src/pages/invoices/ apps/web/src/App.tsx apps/web/src/i18n/
git commit -m "feat: add invoice list and detail frontend pages"
```

---

## Service 4: Customer-Provider Chat (Direct Messaging)

### Task 11: Create chat Prisma schema

**Files:**
- Create: `apps/api/prisma/chat.prisma`
- Modify: `apps/api/prisma/schema.prisma`
- Modify: `docker/init-schemas.sql`

**Step 1: Create chat.prisma**

```prisma
model ChatChannel {
  id                  String    @id @default(uuid()) @db.Uuid
  demandId            String    @map("demand_id") @db.Uuid
  contractId          String?   @map("contract_id") @db.Uuid
  customerUserId      String    @map("customer_user_id") @db.Uuid
  providerUserId      String    @map("provider_user_id") @db.Uuid
  lastMessageAt       DateTime? @map("last_message_at") @db.Timestamptz
  closedAt            DateTime? @map("closed_at") @db.Timestamptz

  createdAt           DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt           DateTime  @updatedAt @map("updated_at") @db.Timestamptz

  messages            ChatMessage[]

  @@unique([demandId, customerUserId, providerUserId])
  @@index([customerUserId])
  @@index([providerUserId])
  @@map("chat_channels")
  @@schema("chat")
}

model ChatMessage {
  id                  String    @id @default(uuid()) @db.Uuid
  channelId           String    @map("channel_id") @db.Uuid
  senderUserId        String    @map("sender_user_id") @db.Uuid
  content             String    @map("content") @db.Text
  attachmentKey       String?   @map("attachment_key")
  readAt              DateTime? @map("read_at") @db.Timestamptz

  createdAt           DateTime  @default(now()) @map("created_at") @db.Timestamptz

  channel             ChatChannel @relation(fields: [channelId], references: [id], onDelete: Cascade)

  @@index([channelId, createdAt])
  @@index([senderUserId])
  @@map("chat_messages")
  @@schema("chat")
}
```

**Step 2: Add "chat" to schemas, init-schemas.sql, run prisma db push**

**Step 3: Commit**

```bash
git add apps/api/prisma/ docker/init-schemas.sql
git commit -m "feat: add chat Prisma schema for customer-provider messaging"
```

---

### Task 12: Create ChatModule (backend)

**Files:**
- Create: `apps/api/src/modules/chat/chat.module.ts`
- Create: `apps/api/src/modules/chat/services/chat.service.ts`
- Create: `apps/api/src/modules/chat/controllers/chat.controller.ts`
- Create: `apps/api/src/modules/chat/dto/chat.dto.ts`
- Modify: `apps/api/src/app.module.ts`

**Step 1: Create ChatService**

Methods:
- `createChannel(demandId, customerUserId, providerUserId)` — Upsert channel
- `sendMessage(channelId, senderUserId, content, attachmentKey?)` — Create message, update lastMessageAt, notify via RealtimeService
- `getChannels(userId, page, pageSize)` — List channels where user is participant, with last message preview + unread count
- `getMessages(channelId, userId, page, pageSize)` — Paginated messages (validate user is participant)
- `markRead(channelId, userId)` — Mark all messages as read
- `closeChannel(channelId)` — Set closedAt

**Step 2: Create ChatController**

```
POST   /api/v1/chat/channels                       → create channel
GET    /api/v1/chat/channels                        → list my channels
GET    /api/v1/chat/channels/:id/messages           → get messages
POST   /api/v1/chat/channels/:id/messages           → send message
PATCH  /api/v1/chat/channels/:id/read               → mark as read
```

**Step 3: Create ChatModule, register in AppModule**

**Step 4: Commit**

```bash
git add apps/api/src/modules/chat/ apps/api/src/app.module.ts
git commit -m "feat: add ChatModule for customer-provider direct messaging"
```

---

### Task 13: Create Chat frontend page

**Files:**
- Create: `apps/web/src/pages/chat/index.tsx`
- Create: `apps/web/src/pages/chat/channel.tsx`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/i18n/en.ts`, `de.ts`, `tr.ts`

**Step 1: Create channel list page**

Left sidebar: List of chat channels (partner name, last message preview, unread badge, time).
Right panel: Selected channel messages + input.

Slack-like layout using Ant Design Flex + List + Input.

**Step 2: Integrate with useSocket**

Listen for `NEW_MESSAGE` events to update unread counts and append new messages in real-time.

**Step 3: Add routes + resources for customer and provider roles**

**Step 4: Commit**

```bash
git add apps/web/src/pages/chat/ apps/web/src/App.tsx apps/web/src/i18n/
git commit -m "feat: add chat page with real-time messaging UI"
```

---

## Service 5: Provider Analytics Dashboard

### Task 14: Create analytics endpoints (backend)

**Files:**
- Create: `apps/api/src/modules/analytics/analytics.module.ts`
- Create: `apps/api/src/modules/analytics/analytics.service.ts`
- Create: `apps/api/src/modules/analytics/analytics.controller.ts`
- Modify: `apps/api/src/app.module.ts`

**Step 1: Create AnalyticsService**

Aggregation queries from existing tables:

```typescript
// Provider-specific
async getProviderStats(providerUserId: string): Promise<{
  totalOffers: number;
  acceptedOffers: number;
  activeContracts: number;
  completedContracts: number;
  totalRevenue: number; // cents
  averageRating: number;
  totalReviews: number;
}>

async getProviderMonthlyRevenue(providerUserId: string, months: number): Promise<{
  month: string; // "2026-01"
  revenue: number;
  contractCount: number;
}[]>

async getProviderRatingBreakdown(providerUserId: string): Promise<{
  aspect: string;
  average: number;
}[]>

// Admin-specific
async getPlatformStats(): Promise<{
  totalDemands: number;
  activeDemands: number;
  totalProviders: number;
  activeProviders: number;
  totalContracts: number;
  totalRevenue: number;
  totalCommission: number;
  onlineUsers: number;
}>

async getDemandsByMonth(months: number): Promise<{
  month: string;
  count: number;
}[]>
```

**Step 2: Create AnalyticsController**

```
GET /api/v1/analytics/provider/stats       → provider dashboard stats
GET /api/v1/analytics/provider/revenue     → monthly revenue chart data
GET /api/v1/analytics/provider/ratings     → rating breakdown
GET /api/v1/analytics/admin/stats          → platform overview
GET /api/v1/analytics/admin/demands        → demands trend chart data
```

**Step 3: Create AnalyticsModule, register in AppModule**

**Step 4: Commit**

```bash
git add apps/api/src/modules/analytics/ apps/api/src/app.module.ts
git commit -m "feat: add AnalyticsModule with provider and admin stats endpoints"
```

---

### Task 15: Install Recharts + create provider dashboard

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/src/pages/analytics/provider-dashboard.tsx`
- Create: `apps/web/src/pages/analytics/admin-dashboard.tsx`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/i18n/en.ts`, `de.ts`, `tr.ts`

**Step 1: Install Recharts**

```bash
cd apps/web && npm install recharts
```

**Step 2: Create provider analytics dashboard**

Page with:
- **Stat cards row**: Total Offers, Accepted Offers, Active Contracts, Revenue, Average Rating (Ant Design Statistic in Cards)
- **Revenue chart**: Monthly revenue bar chart (Recharts BarChart)
- **Rating breakdown**: Horizontal bar chart by aspect (Recharts)
- **Recent contracts table**: Last 5 contracts with status

All data fetched from `/api/v1/analytics/provider/*` endpoints via `useCustom`.

**Step 3: Create admin analytics dashboard**

Page with:
- **Stat cards**: Total Demands, Active Providers, Total Contracts, Platform Revenue, Commission Earned, Online Users
- **Demands trend**: Line chart by month (Recharts LineChart)

**Step 4: Add routes and resources**

- Provider role: `/analytics` → provider dashboard
- Admin role: `/admin/analytics` → admin dashboard

**Step 5: Commit**

```bash
git add apps/web/package.json apps/web/src/pages/analytics/ apps/web/src/App.tsx apps/web/src/i18n/
git commit -m "feat: add provider and admin analytics dashboards with Recharts"
```

---

### Task 16: Final TypeScript check + verification

**Step 1: Run tsc on both apps**

```bash
cd apps/api && npx tsc --noEmit
cd apps/web && npx tsc --noEmit
```

**Step 2: Start all services and verify**

```bash
docker compose -f docker/docker-compose.yml up -d
cd apps/api && npm run start:dev &
cd apps/web && npm run dev &
```

**Step 3: Test checklist**

1. WebSocket: Open browser console, verify socket connects to `/ws`
2. Storage: Upload a file via Swagger `/api/v1/storage`, verify MinIO console
3. Invoice: Create from contract, issue, download PDF
4. Chat: Open two browser tabs (customer + provider), send messages
5. Analytics: Provider dashboard shows stats + charts
6. Admin analytics: Platform overview stats

**Step 4: Final commit + push**

```bash
git add -A
git commit -m "feat: complete 5 new services — WebSocket, Storage, Invoice, Chat, Analytics"
git push
```
