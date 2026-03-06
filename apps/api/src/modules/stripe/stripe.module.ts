import { Module } from '@nestjs/common';
import { CreditModule } from '../credit/credit.module';
import { StripeController } from './controllers/stripe.controller';
import { StripeService } from './services/stripe.service';

@Module({
  imports: [CreditModule],
  controllers: [StripeController],
  providers: [StripeService],
})
export class StripeModule {}
