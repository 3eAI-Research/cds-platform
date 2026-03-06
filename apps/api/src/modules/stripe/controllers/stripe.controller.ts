import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { Public } from '../../../common/decorators/public.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { StripeService } from '../services/stripe.service';
import { CreateCheckoutDto } from '../dto/stripe.dto';

@ApiTags('Payments')
@Controller('payments')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  /**
   * GET /api/v1/payments/packs
   * List available credit packs (public).
   */
  @ApiOperation({ summary: 'List available credit packs' })
  @Public()
  @Get('packs')
  getPacks() {
    return this.stripeService.getAvailablePacks();
  }

  /**
   * POST /api/v1/payments/checkout
   * Create a Stripe Checkout Session for a credit pack.
   */
  @ApiOperation({ summary: 'Create Stripe checkout session for credit pack' })
  @Roles('customer', 'provider_owner')
  @Post('checkout')
  async createCheckout(
    @Body() dto: CreateCheckoutDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.stripeService.createCheckoutSession(user.userId, dto.packId);
  }

  /**
   * POST /api/v1/payments/webhook
   * Stripe webhook endpoint. Requires raw body for signature verification.
   */
  @ApiOperation({ summary: 'Stripe webhook handler' })
  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Req() req: RawBodyRequest<Request>) {
    const signature = req.headers['stripe-signature'] as string;
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException('Missing raw body for webhook verification');
    }

    return this.stripeService.handleWebhook(rawBody, signature);
  }

  /**
   * GET /api/v1/payments/admin/transactions
   * List all payment transactions (admin only).
   */
  @ApiOperation({ summary: 'List all payment transactions (admin)' })
  @Roles('admin')
  @Get('admin/transactions')
  async getAdminTransactions(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.stripeService.getAllTransactions(page ?? 1, pageSize ?? 50);
  }
}
