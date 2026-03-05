import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import {
  DomainEvent,
  DomainEventNames,
  DemandCancelledPayload,
} from './domain-events';

/**
 * Event handlers that update the Offer module in response to Demand events.
 *
 * Subscribers:
 *   DEMAND_CANCELLED → expire all open offers for that demand
 *
 * All handlers are idempotent via processed_events table.
 */
@Injectable()
export class OfferEventHandlers {
  private readonly logger = new Logger(OfferEventHandlers.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * When a demand is cancelled, expire all SUBMITTED offers for that demand.
   */
  @OnEvent(DomainEventNames.DEMAND_CANCELLED)
  async handleDemandCancelled(
    event: DomainEvent<DemandCancelledPayload>,
  ): Promise<void> {
    const { idempotencyKey, payload } = event;

    try {
      await this.prisma.$transaction(async (tx) => {
        // Idempotency check
        const existing = await tx.offerProcessedEvent.findUnique({
          where: { idempotencyKey },
        });
        if (existing) {
          this.logger.debug(`Already processed: ${idempotencyKey}`);
          return;
        }

        // Business logic: expire all open offers for this demand
        const result = await tx.offer.updateMany({
          where: {
            demandId: payload.demandId,
            status: 'SUBMITTED',
            deletedAt: null,
          },
          data: { status: 'EXPIRED' },
        });

        // Record as processed
        await tx.offerProcessedEvent.create({
          data: {
            idempotencyKey,
            eventId: event.eventId,
            eventType: event.type,
          },
        });

        this.logger.log(
          `Expired ${result.count} offers for cancelled demand ${payload.demandId}`,
        );
      });
    } catch (error) {
      this.logger.error(
        `Failed to handle DEMAND_CANCELLED for demand ${payload.demandId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
