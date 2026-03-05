import { Module } from '@nestjs/common';
import { OfferController } from './controllers/offer.controller';
import { OfferService } from './services/offer.service';
import { CommissionService } from './services/commission.service';

@Module({
  controllers: [OfferController],
  providers: [OfferService, CommissionService],
  exports: [OfferService, CommissionService],
})
export class OfferModule {}
