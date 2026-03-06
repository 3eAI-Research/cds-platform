import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreditService } from '../../credit/services/credit.service';
import { CREDIT_PACKS, PackId } from '../dto/stripe.dto';

@Injectable()
export class StripeService {
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;
  private readonly logger = new Logger(StripeService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly creditService: CreditService,
  ) {
    this.stripe = new Stripe(
      this.configService.get<string>('STRIPE_SECRET_KEY', ''),
    );
    this.webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
      '',
    );
  }

  /**
   * Return available credit packs for display.
   */
  getAvailablePacks() {
    return Object.entries(CREDIT_PACKS).map(([packId, pack]) => ({
      packId,
      credits: pack.credits,
      amountCents: pack.amountCents,
      label: pack.label,
    }));
  }

  /**
   * Create a Stripe Checkout Session for a credit pack purchase.
   * Saves a pending CreditPaymentTransaction for tracking.
   */
  async createCheckoutSession(userId: string, packId: PackId) {
    const pack = CREDIT_PACKS[packId];
    const corsOrigin =
      this.configService.get<string>('CORS_ORIGIN') ?? 'http://localhost:3001';

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: pack.label,
            },
            unit_amount: pack.amountCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        packId,
        credits: String(pack.credits),
      },
      success_url: `${corsOrigin}/credits/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${corsOrigin}/credits/cancel`,
    });

    // Persist pending transaction for reconciliation
    await this.prisma.creditPaymentTransaction.create({
      data: {
        userId,
        stripeSessionId: session.id,
        packId,
        credits: pack.credits,
        amountCents: pack.amountCents,
        currency: 'eur',
        status: 'pending',
      },
    });

    this.logger.log(
      `Checkout session created: ${session.id} for user ${userId}, pack ${packId}`,
    );

    return { checkoutUrl: session.url };
  }

  /**
   * Handle Stripe webhook events.
   * Verifies the signature and processes checkout.session.completed events.
   */
  async handleWebhook(payload: Buffer, signature: string) {
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret,
      );
    } catch (err) {
      this.logger.error(`Webhook signature verification failed: ${err}`);
      throw err;
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const { userId, packId, credits } = session.metadata ?? {};

      if (!userId || !packId || !credits) {
        this.logger.warn(
          `Webhook missing metadata for session ${session.id}`,
        );
        return { received: true };
      }

      // Idempotency: skip if already completed
      const existing = await this.prisma.creditPaymentTransaction.findUnique({
        where: { stripeSessionId: session.id },
      });

      if (existing?.status === 'completed') {
        this.logger.log(
          `Session ${session.id} already completed, skipping duplicate webhook`,
        );
        return { received: true };
      }

      // Credit the user's account
      const creditAmount = parseInt(credits, 10);
      await this.creditService.addCredits(
        userId,
        creditAmount,
        'PURCHASE',
        packId,
        session.id,
      );

      // Mark transaction as completed
      await this.prisma.creditPaymentTransaction.update({
        where: { stripeSessionId: session.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      });

      this.logger.log(
        `Credits added: ${creditAmount} for user ${userId} (session ${session.id})`,
      );
    }

    return { received: true };
  }

  /**
   * Get all payment transactions (admin).
   */
  async getAllTransactions(page: number | string, pageSize: number | string) {
    const p = Number(page) || 1;
    const ps = Number(pageSize) || 50;
    const skip = (p - 1) * ps;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.creditPaymentTransaction.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: ps,
      }),
      this.prisma.creditPaymentTransaction.count(),
    ]);

    return {
      items: items.map((t) => ({
        id: t.id,
        userId: t.userId,
        packName: t.packId,
        amount: t.amountCents,
        credits: t.credits,
        status: t.status,
        stripeSessionId: t.stripeSessionId,
        createdAt: t.createdAt,
      })),
      total,
      page: p,
      pageSize: ps,
      totalPages: Math.ceil(total / ps),
    };
  }
}
