import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import {
  DomainEvent,
  DomainEventNames,
  OfferSubmittedPayload,
  OfferAcceptedPayload,
} from './domain-events';

/**
 * Event handlers that update the Demand module in response to Offer events.
 *
 * Subscribers:
 *   OFFER_SUBMITTED → demand.offerCount++
 *   OFFER_ACCEPTED  → demand.status = ACCEPTED, demand.acceptedOfferId = offerId
 *
 * All handlers are idempotent via processed_events table.
 */
@Injectable()
export class DemandEventHandlers {
  private readonly logger = new Logger(DemandEventHandlers.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * When an offer is submitted, increment the demand's offer count.
   * Also transitions PUBLISHED → OFFERED on first offer.
   */
  @OnEvent(DomainEventNames.OFFER_SUBMITTED)
  async handleOfferSubmitted(
    event: DomainEvent<OfferSubmittedPayload>,
  ): Promise<void> {
    const { idempotencyKey, payload } = event;

    try {
      await this.prisma.$transaction(async (tx) => {
        // Idempotency check
        const existing = await tx.demandProcessedEvent.findUnique({
          where: { idempotencyKey },
        });
        if (existing) {
          this.logger.debug(`Already processed: ${idempotencyKey}`);
          return;
        }

        // Read current demand to decide status transition
        const demand = await tx.demand.findUnique({
          where: { id: payload.demandId },
        });

        if (!demand) {
          this.logger.warn(`Demand ${payload.demandId} not found, skipping`);
          return;
        }

        // Business logic: increment offerCount + status transition
        if (demand.status === 'PUBLISHED') {
          // First offer: PUBLISHED → OFFERED
          await tx.demand.update({
            where: { id: payload.demandId },
            data: { offerCount: { increment: 1 }, status: 'OFFERED' },
          });
        } else if (demand.status === 'OFFERED') {
          // Subsequent offers: just increment count
          await tx.demand.update({
            where: { id: payload.demandId },
            data: { offerCount: { increment: 1 } },
          });
        }
        // ACCEPTED, CANCELLED, etc. — don't modify status

        // Record as processed
        await tx.demandProcessedEvent.create({
          data: {
            idempotencyKey,
            eventId: event.eventId,
            eventType: event.type,
          },
        });
      });

      this.logger.log(
        `Demand ${payload.demandId} offerCount incremented (offer: ${payload.offerId})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle OFFER_SUBMITTED for demand ${payload.demandId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * When an offer is accepted, update demand status to ACCEPTED.
   */
  @OnEvent(DomainEventNames.OFFER_ACCEPTED)
  async handleOfferAccepted(
    event: DomainEvent<OfferAcceptedPayload>,
  ): Promise<void> {
    const { idempotencyKey, payload } = event;

    try {
      await this.prisma.$transaction(async (tx) => {
        const existing = await tx.demandProcessedEvent.findUnique({
          where: { idempotencyKey },
        });
        if (existing) {
          this.logger.debug(`Already processed: ${idempotencyKey}`);
          return;
        }

        await tx.demand.update({
          where: { id: payload.demandId },
          data: {
            status: 'ACCEPTED',
            acceptedOfferId: payload.offerId,
          },
        });

        await tx.demandProcessedEvent.create({
          data: {
            idempotencyKey,
            eventId: event.eventId,
            eventType: event.type,
          },
        });
      });

      this.logger.log(
        `Demand ${payload.demandId} accepted (offer: ${payload.offerId})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle OFFER_ACCEPTED for demand ${payload.demandId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
