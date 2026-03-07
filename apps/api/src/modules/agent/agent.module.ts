import { Module } from '@nestjs/common';
import { CreditModule } from '../credit/credit.module';
import { TransportModule } from '../transport/transport.module';
import { DemandModule } from '../demand/demand.module';
import { AgentController } from './controllers/agent.controller';
import { AgentService } from './services/agent.service';
import { MistralService } from './services/mistral.service';
import { PlanCalculatorService } from './services/plan-calculator.service';
import { PhotoAnalyzerService } from './services/photo-analyzer.service';
import { PhotoStorageService } from './services/photo-storage.service';
import { ReportService } from './services/report.service';

@Module({
  imports: [CreditModule, TransportModule, DemandModule],
  controllers: [AgentController],
  providers: [
    AgentService,
    MistralService,
    PlanCalculatorService,
    PhotoAnalyzerService,
    PhotoStorageService,
    ReportService,
  ],
  exports: [AgentService],
})
export class AgentModule {}
