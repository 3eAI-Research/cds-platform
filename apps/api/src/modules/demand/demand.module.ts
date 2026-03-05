import { Module } from '@nestjs/common';
import { TransportModule } from '../transport/transport.module';
import { DemandController } from './controllers/demand.controller';
import { DemandService } from './services/demand.service';

@Module({
  imports: [TransportModule],
  controllers: [DemandController],
  providers: [DemandService],
  exports: [DemandService],
})
export class DemandModule {}
