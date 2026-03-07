import { Injectable, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { InvoicePdfService } from './invoice-pdf.service';
import { BusinessException } from '../../../common/exceptions/business.exception';
import { ErrorCode } from '../../../common/types/error-codes';

@Injectable()
export class InvoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly pdfService: InvoicePdfService,
  ) {}

  private async generateInvoiceNumber(): Promise<string> {
    const now = new Date();
    const prefix = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const count = await this.prisma.invoice.count({
      where: { invoiceNumber: { startsWith: prefix } },
    });
    return `${prefix}-${String(count + 1).padStart(5, '0')}`;
  }

  async createFromContract(contractId: string): Promise<any> {
    // Check if invoice already exists for this contract
    const existing = await this.prisma.invoice.findFirst({
      where: { contractId },
    });
    if (existing) {
      throw new BusinessException(
        ErrorCode.BIZ_DUPLICATE_OFFER,
        'Invoice already exists for this contract',
        HttpStatus.CONFLICT,
      );
    }

    // Get contract data
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
    });
    if (!contract) {
      throw new BusinessException(
        ErrorCode.NOT_FOUND,
        'Contract not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const invoiceNumber = await this.generateInvoiceNumber();
    const subtotalAmount = contract.agreedPriceAmount;
    const vatRate = 19;
    const vatAmount = Math.round(subtotalAmount * vatRate / 100);
    const commissionRate = 4;
    const commissionAmount = Math.round(subtotalAmount * commissionRate / 100);
    const totalAmount = subtotalAmount + vatAmount;

    return this.prisma.invoice.create({
      data: {
        invoiceNumber,
        contractId,
        demandId: contract.demandId,
        customerUserId: contract.customerUserId,
        providerUserId: contract.providerUserId,
        providerCompanyId: contract.providerCompanyId,
        subtotalAmount,
        vatRate,
        vatAmount,
        commissionRate,
        commissionAmount,
        totalAmount,
        currency: 'EUR',
        customerName: 'Customer', // MVP: placeholder, would be resolved from user service
        providerName: 'Provider', // MVP: placeholder
        serviceDescription: `Moving service — Contract #${contractId.slice(0, 8)}`,
        serviceDate: contract.serviceDate,
        status: 'DRAFT',
      },
    });
  }

  async issue(invoiceId: string): Promise<any> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });
    if (!invoice) {
      throw new BusinessException(
        ErrorCode.NOT_FOUND,
        'Invoice not found',
        HttpStatus.NOT_FOUND,
      );
    }
    if (invoice.status !== 'DRAFT') {
      throw new BusinessException(
        ErrorCode.BIZ_INVALID_STATUS_TRANSITION,
        'Only DRAFT invoices can be issued',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Generate PDF
    const pdfBuffer = await this.pdfService.generatePdf({
      ...invoice,
    });

    // Upload to MinIO
    const uploadResult = await this.storage.upload(
      pdfBuffer,
      `${invoice.invoiceNumber}.pdf`,
      'application/pdf',
      'invoices',
    );

    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'ISSUED',
        pdfKey: uploadResult.key,
        issuedAt: new Date(),
      },
    });
  }

  async markPaid(invoiceId: string): Promise<any> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });
    if (!invoice) {
      throw new BusinessException(
        ErrorCode.NOT_FOUND,
        'Invoice not found',
        HttpStatus.NOT_FOUND,
      );
    }
    if (invoice.status !== 'ISSUED') {
      throw new BusinessException(
        ErrorCode.BIZ_INVALID_STATUS_TRANSITION,
        'Only ISSUED invoices can be marked paid',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: 'PAID', paidAt: new Date() },
    });
  }

  async cancel(invoiceId: string): Promise<any> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });
    if (!invoice) {
      throw new BusinessException(
        ErrorCode.NOT_FOUND,
        'Invoice not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: 'CANCELLED' },
    });
  }

  async findById(id: string): Promise<any> {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) {
      throw new BusinessException(
        ErrorCode.NOT_FOUND,
        'Invoice not found',
        HttpStatus.NOT_FOUND,
      );
    }

    let downloadUrl: string | null = null;
    if (invoice.pdfKey) {
      downloadUrl = await this.storage.getDownloadUrl(invoice.pdfKey);
    }

    return { ...invoice, downloadUrl };
  }

  async findByUser(
    userId: string,
    page: number | string,
    pageSize: number | string,
    status?: string,
  ) {
    const p = Number(page) || 1;
    const ps = Number(pageSize) || 20;
    const skip = (p - 1) * ps;

    const where: any = {
      OR: [{ customerUserId: userId }, { providerUserId: userId }],
    };
    if (status) where.status = status;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: ps,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      items,
      total,
      page: p,
      pageSize: ps,
      totalPages: Math.ceil(total / ps),
    };
  }

  async findAll(page: number | string, pageSize: number | string, status?: string) {
    const p = Number(page) || 1;
    const ps = Number(pageSize) || 20;
    const skip = (p - 1) * ps;

    const where: any = {};
    if (status) where.status = status;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: ps,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      items,
      total,
      page: p,
      pageSize: ps,
      totalPages: Math.ceil(total / ps),
    };
  }
}
