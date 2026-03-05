import { Module } from '@nestjs/common';
import { ContractController } from './controllers/contract.controller';
import { ContractService } from './services/contract.service';

@Module({
  controllers: [ContractController],
  providers: [ContractService],
  exports: [ContractService],
})
export class ContractModule {}
