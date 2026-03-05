import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { ContractService } from '../modules/contract/services/contract.service';
import {
  DomainEvent,
  DomainEventNames,
  OfferAcceptedPayload,
} from './domain-events';

/**
 * Event handlers that create/update contracts.
 *
 * Subscribers:
 *   OFFER_ACCEPTED → auto-create DRAFT contract
 */
@Injectable()
export class ContractEventHandlers {
  private readonly logger = new Logger(ContractEventHandlers.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly contractService: ContractService,
  ) {}

  /**
   * When an offer is accepted, auto-create a DRAFT contract.
   *
   * Contract terms come from the accepted offer:
   * - agreedPriceAmount = offer.totalPriceAmount
   * - commissionAmount = offer.commissionAmount
   * - serviceDate = demand.preferredDateStart (from transportation)
   */
  @OnEvent(DomainEventNames.OFFER_ACCEPTED)
  async handleOfferAccepted(
    event: DomainEvent<OfferAcceptedPayload>,
  ): Promise<void> {
    const { idempotencyKey, payload } = event;

    try {
      // Idempotency check (contract schema's processed_events)
      const existing = await this.prisma.contractProcessedEvent.findUnique({
        where: { idempotencyKey },
      });

      if (existing) {
        this.logger.debug(`Already processed: ${idempotencyKey}`);
        return;
      }

      // Look up the demand to get service date
      const demand = await this.prisma.demand.findUnique({
        where: { id: payload.demandId },
      });

      // Look up transportation for preferred dates
      let serviceDate = new Date();
      if (demand?.transportationId) {
        const transportation = await this.prisma.transportation.findUnique({
          where: { id: demand.transportationId },
        });
        if (transportation) {
          serviceDate = transportation.preferredDateStart;
        }
      }

      // Create contract
      await this.contractService.createFromOffer({
        demandId: payload.demandId,
        offerId: payload.offerId,
        customerUserId: payload.customerUserId,
        providerUserId: payload.providerUserId,
        providerCompanyId: payload.providerCompanyId,
        totalPriceAmount: payload.totalPriceAmount,
        commissionAmount: payload.commissionAmount,
        vatAmount: payload.vatAmount,
        serviceDate,
        serviceDescription: `Umzugsdienstleistung — Auftrag ${payload.demandId}`,
        createdBy: payload.customerUserId,
      });

      // Record as processed
      await this.prisma.contractProcessedEvent.create({
        data: {
          idempotencyKey,
          eventId: event.eventId,
          eventType: event.type,
        },
      });

      this.logger.log(
        `Contract created for offer ${payload.offerId} (demand: ${payload.demandId})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create contract for offer ${payload.offerId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
