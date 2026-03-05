import { Module } from '@nestjs/common';
import { OfferModule } from '../offer/offer.module';
import { PaymentController } from './controllers/payment.controller';
import { PaymentService } from './services/payment.service';

@Module({
  imports: [OfferModule],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
