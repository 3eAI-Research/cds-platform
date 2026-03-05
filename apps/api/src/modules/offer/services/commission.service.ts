import { Injectable } from '@nestjs/common';

/**
 * Commission calculation service.
 *
 * CDS Principle: Transparent, low commission (3-5%).
 * MVP: Flat 4% commission rate.
 * Phase 2: Tiered rates based on volume, provider tier, etc.
 *
 * All amounts in integer cents (EUR) — never float for money.
 */

export interface CommissionCalculation {
  totalPriceAmount: number; // cents (input)
  commissionRate: number; // e.g., 0.04
  commissionAmount: number; // cents
  providerNetAmount: number; // cents (totalPrice - commission)
  vatRate: number; // e.g., 0.19
  vatAmount: number; // cents (on commission only)
}

@Injectable()
export class CommissionService {
  private readonly DEFAULT_COMMISSION_RATE = 0.04; // 4%
  private readonly VAT_RATE = 0.19; // 19% German VAT

  /**
   * Calculate commission for a given total price.
   *
   * Commission is charged on the total price.
   * VAT is calculated on the commission amount (not on total price).
   * Provider receives: totalPrice - commission.
   */
  calculate(totalPriceAmount: number): CommissionCalculation {
    const commissionRate = this.DEFAULT_COMMISSION_RATE;
    const commissionAmount = Math.round(totalPriceAmount * commissionRate);
    const providerNetAmount = totalPriceAmount - commissionAmount;
    const vatAmount = Math.round(commissionAmount * this.VAT_RATE);

    return {
      totalPriceAmount,
      commissionRate,
      commissionAmount,
      providerNetAmount,
      vatRate: this.VAT_RATE,
      vatAmount,
    };
  }
}
