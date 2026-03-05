import { Module } from '@nestjs/common';
import { ProviderController } from './controllers/provider.controller';
import { ProviderService } from './services/provider.service';

@Module({
  controllers: [ProviderController],
  providers: [ProviderService],
  exports: [ProviderService],
})
export class ProviderModule {}
