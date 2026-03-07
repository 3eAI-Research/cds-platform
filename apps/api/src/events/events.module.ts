import { Module } from '@nestjs/common';
import { ContractModule } from '../modules/contract/contract.module';
import { NotificationModule } from '../modules/notification/notification.module';
import { ContractEventHandlers } from './contract-event.handlers';
import { DemandEventHandlers } from './demand-event.handlers';
import { OfferEventHandlers } from './offer-event.handlers';
import { NotificationEventHandlers } from './notification-event.handlers';
import { RealtimeEventHandler } from './realtime-event.handler';

/**
 * Events module — registers all domain event handlers.
 *
 * MVP: handlers use NestJS EventEmitter (in-process, synchronous).
 * Phase 2: migrate to Kafka consumers (async, at-least-once delivery).
 *
 * Handler naming convention: {TargetModule}EventHandlers
 *   - DemandEventHandlers: handles events that affect the Demand module
 *   - OfferEventHandlers: handles events that affect the Offer module
 *   - ContractEventHandlers: handles events that create/update contracts
 *   - NotificationEventHandlers: creates in-app notifications
 */
@Module({
  imports: [ContractModule, NotificationModule],
  providers: [
    DemandEventHandlers,
    OfferEventHandlers,
    ContractEventHandlers,
    NotificationEventHandlers,
    RealtimeEventHandler,
  ],
})
export class EventsModule {}
