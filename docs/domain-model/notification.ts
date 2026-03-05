/**
 * CDS Platform — Notification Types (Benachrichtigung)
 *
 * Event-driven notification system. MVP: email only.
 * Phase 2: push notifications, SMS, in-app.
 *
 * Lives in: notification schema
 * OAK source: OAK.Services.NotificationService, OAK.Services.EmailService
 *
 * Architecture:
 * Domain events → NestJS EventEmitter (in-process) → NotificationService → Email
 * Phase 2: EventEmitter → Kafka topic → NotificationService
 *
 * @module notification
 */

import { BaseEntity, PII } from './core-types';

// =============================================================================
// Notification (Benachrichtigung)
// =============================================================================

/**
 * A notification record.
 * DE: Benachrichtigung
 *
 * OAK had NotificationService + EmailService but no persistent notification entity.
 * CDS stores notification records for audit and retry logic.
 */
export interface Notification extends BaseEntity {
  /** Recipient user ID */
  recipientUserId: string;
  /** Recipient email — @pii */
  recipientEmail: PII<string>;

  /** Notification type */
  type: NotificationType;
  /** Delivery channel */
  channel: NotificationChannel;
  /** Delivery status */
  status: NotificationDeliveryStatus;

  /** Subject line (for email). DE: Betreff */
  subject: string;
  /** Notification body (HTML for email) */
  body: string;
  /** Locale used for rendering */
  locale: string;

  /** Reference to the domain entity that triggered this notification */
  referenceType?: string; // 'demand' | 'offer' | 'contract' | 'payment'
  referenceId?: string;

  /** Delivery timestamps */
  sentAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  /** Number of retry attempts */
  retryCount: number;
}

// =============================================================================
// Notification Types (Benachrichtigungstypen)
// =============================================================================

/**
 * Types of notifications the system sends.
 * MVP: only the critical lifecycle notifications.
 *
 * OAK had email templates at Documents/assets/htmlFiles/ for:
 * - AccountVerification, EmailConfirmation, ForgotPassword
 * We add CDS-specific notifications.
 */
export enum NotificationType {
  // --- Auth ---
  /** Email verification after registration. DE: E-Mail-Bestätigung */
  EMAIL_VERIFICATION = 'EMAIL_VERIFICATION',
  /** Password reset. DE: Passwort zurücksetzen */
  PASSWORD_RESET = 'PASSWORD_RESET',

  // --- Demand lifecycle ---
  /** New offer received on customer's demand. DE: Neues Angebot erhalten */
  NEW_OFFER_RECEIVED = 'NEW_OFFER_RECEIVED',
  /** Offer accepted by customer → notify provider. DE: Angebot angenommen */
  OFFER_ACCEPTED = 'OFFER_ACCEPTED',
  /** Offer rejected → notify provider. DE: Angebot abgelehnt */
  OFFER_REJECTED = 'OFFER_REJECTED',

  // --- Contract ---
  /** Contract ready for acceptance. DE: Vertrag zur Bestätigung */
  CONTRACT_READY = 'CONTRACT_READY',
  /** Contract fully accepted by both parties. DE: Vertrag bestätigt */
  CONTRACT_ACTIVE = 'CONTRACT_ACTIVE',
  /** Contract PDF generated and attached. DE: Vertragsdokument */
  CONTRACT_PDF_READY = 'CONTRACT_PDF_READY',

  // --- Payment ---
  /** Payment completed. DE: Zahlung eingegangen */
  PAYMENT_COMPLETED = 'PAYMENT_COMPLETED',
  /** Provider payout transferred. DE: Auszahlung überwiesen */
  PROVIDER_PAYOUT = 'PROVIDER_PAYOUT',

  // --- Review ---
  /** Reminder to leave a review after service. DE: Bewertung abgeben */
  REVIEW_REMINDER = 'REVIEW_REMINDER',
  /** New review received on your profile. DE: Neue Bewertung */
  NEW_REVIEW_RECEIVED = 'NEW_REVIEW_RECEIVED',

  // --- Provider onboarding ---
  /** Deposit received, account activated. DE: Konto aktiviert */
  PROVIDER_ACTIVATED = 'PROVIDER_ACTIVATED',
}

export enum NotificationChannel {
  EMAIL = 'EMAIL',
  // Phase 2:
  // PUSH = 'PUSH',
  // SMS = 'SMS',
  // IN_APP = 'IN_APP',
}

export enum NotificationDeliveryStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
}
