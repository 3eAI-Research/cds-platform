import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { InvoiceService } from './services/invoice.service';
import { InvoicePdfService } from './services/invoice-pdf.service';
import { InvoiceController } from './controllers/invoice.controller';

@Module({
  imports: [PrismaModule],
  controllers: [InvoiceController],
  providers: [InvoiceService, InvoicePdfService],
  exports: [InvoiceService],
})
export class InvoiceModule {}
