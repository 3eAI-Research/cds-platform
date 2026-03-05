/**
 * CDS Platform — Payment Types (Zahlung)
 *
 * Payment processing via Stripe Connect Europe.
 * Hosted checkout — card data never touches our servers (SAQ A).
 * Commission split: platform 3-5%, rest to provider.
 *
 * Lives in: payment schema
 * OAK source: Demand.DemandCommission/DemandVAT/DemandGrossValue (basic fields only)
 *
 * @module payment
 */

import { BaseEntity, PaymentStatus, Money } from './core-types';

// =============================================================================
// Payment Gateway Interface (Adapter Pattern)
// =============================================================================

/**
 * Payment gateway adapter interface.
 * MVP: StripePaymentGateway implementation.
 *
 * Defined by Mimar in HLD. Concrete implementation is provider-specific.
 */
export interface PaymentGateway {
  /** Create a hosted checkout session for customer payment */
  createCheckoutSession(params: CheckoutParams): Promise<CheckoutSession>;
  /** Handle incoming webhook from payment provider */
  handleWebhook(payload: unknown, signature: string): Promise<PaymentEvent>;
  /** Create a connected account for a provider (Stripe Connect onboarding) */
  createProviderAccount(provider: ProviderPaymentInfo): Promise<ConnectedAccount>;
  /** Transfer funds to provider after service completion */
  transferToProvider(params: TransferParams): Promise<Transfer>;
}

// =============================================================================
// Payment Transaction (Zahlungstransaktion)
// =============================================================================

/**
 * A payment transaction record.
 * DE: Zahlungstransaktion
 *
 * OAK had commission fields on Demand/Transportation entities.
 * CDS separates payment into its own module with proper transaction records.
 */
export interface PaymentTransaction extends BaseEntity {
  /** Reference to the contract this payment is for */
  contractId: string;
  /** Reference to the demand */
  demandId: string;
  /** Customer user ID */
  customerUserId: string;
  /** Provider user ID */
  providerUserId: string;
  /** Provider company ID */
  providerCompanyId: string;

  /** Transaction type */
  type: PaymentTransactionType;
  /** Current status. DE: Zahlungsstatus */
  status: PaymentStatus;

  // --- Amounts ---

  /** Total amount charged to customer. DE: Gesamtbetrag */
  totalAmount: Money;
  /** Platform commission. DE: Plattformgebühr */
  commissionAmount: Money;
  /** Commission rate (e.g., 0.04 = 4%). DE: Provisionssatz */
  commissionRate: number;
  /** Net amount for provider. DE: Nettobetrag Anbieter */
  providerNetAmount: Money;
  /** VAT amount. DE: MwSt */
  vatAmount: Money;

  // --- Stripe references ---

  /** Stripe PaymentIntent ID */
  stripePaymentIntentId?: string;
  /** Stripe Checkout Session ID */
  stripeCheckoutSessionId?: string;
  /** Stripe Transfer ID (to connected account) */
  stripeTransferId?: string;

  // --- Timestamps ---

  /** When payment was initiated */
  initiatedAt: Date;
  /** When payment was completed (webhook confirmation) */
  completedAt?: Date;
  /** When provider payout was transferred */
  transferredAt?: Date;
}

export enum PaymentTransactionType {
  /** Customer paying for a service. DE: Servicezahlung */
  SERVICE_PAYMENT = 'SERVICE_PAYMENT',
  /** Provider paying deposit. DE: Kautionszahlung */
  DEPOSIT = 'DEPOSIT',
  /** Refund to customer. DE: Erstattung */
  REFUND = 'REFUND',
  /** Deposit return to provider. DE: Kautionsrückzahlung */
  DEPOSIT_RETURN = 'DEPOSIT_RETURN',
}

// =============================================================================
// Checkout Types
// =============================================================================

export interface CheckoutParams {
  contractId: string;
  customerEmail: string;
  amount: Money;
  commissionAmount: Money;
  providerStripeAccountId: string;
  /** Stripe success/cancel redirect URLs */
  successUrl: string;
  cancelUrl: string;
  /** BCP 47 locale for checkout page (e.g., 'de') */
  locale: string;
}

export interface CheckoutSession {
  sessionId: string;
  checkoutUrl: string;
  expiresAt: Date;
}

// =============================================================================
// Stripe Connect Types
// =============================================================================

export interface ProviderPaymentInfo {
  companyId: string;
  ownerEmail: string;
  companyName: string;
  countryCode: string;
}

export interface ConnectedAccount {
  stripeAccountId: string;
  onboardingUrl: string;
  onboardingComplete: boolean;
}

export interface TransferParams {
  transactionId: string;
  stripeAccountId: string;
  amount: Money;
}

export interface Transfer {
  stripeTransferId: string;
  amount: Money;
  transferredAt: Date;
}

// =============================================================================
// Payment Events (Domain Events)
// =============================================================================

/**
 * Events emitted by the payment module.
 * Consumed by: demand (status update), contract (fulfillment), notification (email).
 */
export interface PaymentEvent {
  type: PaymentEventType;
  transactionId: string;
  contractId: string;
  demandId: string;
  timestamp: Date;
}

export enum PaymentEventType {
  PAYMENT_COMPLETED = 'PAYMENT_COMPLETED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PROVIDER_PAYOUT_COMPLETED = 'PROVIDER_PAYOUT_COMPLETED',
  REFUND_COMPLETED = 'REFUND_COMPLETED',
  DEPOSIT_RECEIVED = 'DEPOSIT_RECEIVED',
}
