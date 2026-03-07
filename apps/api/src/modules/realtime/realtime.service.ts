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
