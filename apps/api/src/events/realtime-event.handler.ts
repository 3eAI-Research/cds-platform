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
