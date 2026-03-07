import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseWrapperInterceptor } from './common/interceptors/response-wrapper.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

// Domain modules
import { AuthModule } from './modules/auth/auth.module';
import { DemandModule } from './modules/demand/demand.module';
import { OfferModule } from './modules/offer/offer.module';
import { TransportModule } from './modules/transport/transport.module';
import { ProviderModule } from './modules/provider/provider.module';
import { ContractModule } from './modules/contract/contract.module';
import { PaymentModule } from './modules/payment/payment.module';
import { ReviewModule } from './modules/review/review.module';
import { NotificationModule } from './modules/notification/notification.module';
import { CreditModule } from './modules/credit/credit.module';
import { StripeModule } from './modules/stripe/stripe.module';
import { AgentModule } from './modules/agent/agent.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { StorageModule } from './modules/storage/storage.module';
import { InvoiceModule } from './modules/invoice/invoice.module';
import { ChatModule } from './modules/chat/chat.module';
import { EventsModule } from './events/events.module';

@Module({
  imports: [
    // --- Infrastructure ---
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    EventEmitterModule.forRoot({
      // MVP: synchronous in-process events. Phase 2: Kafka.
      wildcard: false,
      delimiter: '.',
      maxListeners: 20,
    }),
    PrismaModule,
    RedisModule,

    // --- Domain Modules ---
    AuthModule,
    DemandModule,
    OfferModule,
    TransportModule,
    ProviderModule,
    ContractModule,
    PaymentModule,
    ReviewModule,
    NotificationModule,
    CreditModule,
    StripeModule,
    AgentModule,
    RealtimeModule,
    StorageModule,
    InvoiceModule,
    ChatModule,

    // --- Cross-cutting Event Handlers ---
    EventsModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseWrapperInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
