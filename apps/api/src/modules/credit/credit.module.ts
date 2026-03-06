import { Module } from '@nestjs/common';
import { CreditController } from './controllers/credit.controller';
import { CreditService } from './services/credit.service';

@Module({
  controllers: [CreditController],
  providers: [CreditService],
  exports: [CreditService],
})
export class CreditModule {}
