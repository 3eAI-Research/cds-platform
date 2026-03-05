import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  DomainEvent,
  DomainEventNames,
  DemandPublishedPayload,
  OfferSubmittedPayload,
  OfferAcceptedPayload,
  ContractActivePayload,
} from './domain-events';
import { NotificationService } from '../modules/notification/services/notification.service';

/**
 * Notification event handlers — create in-app notifications for key events.
 *
 * MVP: DB-only notifications. Phase 2: email/push delivery.
 */
@Injectable()
export class NotificationEventHandlers {
  constructor(private readonly notificationService: NotificationService) {}

  @OnEvent(DomainEventNames.DEMAND_PUBLISHED)
  async handleDemandPublished(
    event: DomainEvent<DemandPublishedPayload>,
  ): Promise<void> {
    await this.notificationService.create({
      recipientUserId: event.payload.customerUserId,
      type: 'DEMAND_PUBLISHED',
      subject: 'Anfrage veröffentlicht',
      body: `Ihre Umzugsanfrage wurde erfolgreich veröffentlicht. Sie erhalten Angebote von Dienstleistern.`,
      referenceType: 'demand',
      referenceId: event.payload.demandId,
    });
  }

  @OnEvent(DomainEventNames.OFFER_SUBMITTED)
  async handleOfferSubmitted(
    event: DomainEvent<OfferSubmittedPayload>,
  ): Promise<void> {
    // Notify customer that a new offer was received
    // MVP: we don't have customerUserId in offer payload, skip for now
    // Phase 2: look up demand.customerUserId
  }

  @OnEvent(DomainEventNames.OFFER_ACCEPTED)
  async handleOfferAccepted(
    event: DomainEvent<OfferAcceptedPayload>,
  ): Promise<void> {
    // Notify provider that their offer was accepted
    await this.notificationService.create({
      recipientUserId: event.payload.providerUserId,
      type: 'OFFER_ACCEPTED',
      subject: 'Angebot angenommen',
      body: `Ihr Angebot wurde vom Kunden angenommen. Ein Vertrag wird erstellt.`,
      referenceType: 'offer',
      referenceId: event.payload.offerId,
    });
  }

  @OnEvent(DomainEventNames.CONTRACT_ACTIVE)
  async handleContractActive(
    event: DomainEvent<ContractActivePayload>,
  ): Promise<void> {
    // Notify both parties
    await this.notificationService.create({
      recipientUserId: event.payload.customerUserId,
      type: 'CONTRACT_ACTIVE',
      subject: 'Vertrag aktiv',
      body: `Ihr Vertrag ist jetzt aktiv. Der Umzugstermin wird bald bestätigt.`,
      referenceType: 'contract',
      referenceId: event.payload.contractId,
    });

    // MVP: providerUserId not in ContractActivePayload, skip provider notification
    // Phase 2: add providerUserId to payload
  }
}
