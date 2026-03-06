import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export const CREDIT_PACKS = {
  starter: { credits: 5, amountCents: 500, label: 'Starter (5 Credits)' },
  standard: { credits: 20, amountCents: 1500, label: 'Standard (20 Credits)' },
  pro: { credits: 50, amountCents: 3000, label: 'Pro (50 Credits)' },
} as const;

export type PackId = keyof typeof CREDIT_PACKS;

export class CreateCheckoutDto {
  @ApiProperty({
    enum: ['starter', 'standard', 'pro'],
    description: 'Credit pack to purchase',
    example: 'standard',
  })
  @IsIn(['starter', 'standard', 'pro'])
  packId!: PackId;
}
