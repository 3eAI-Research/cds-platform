import { Injectable } from '@nestjs/common';

@Injectable()
export class InvoicePdfService {
  async generatePdf(invoice: {
    invoiceNumber: string;
    customerName: string;
    customerAddress?: string | null;
    providerName: string;
    providerAddress?: string | null;
    providerTaxId?: string | null;
    serviceDescription: string;
    serviceDate?: Date | null;
    subtotalAmount: number;
    vatRate: number;
    vatAmount: number;
    commissionRate: number;
    commissionAmount: number;
    totalAmount: number;
    currency: string;
    issuedAt?: Date | null;
  }): Promise<Buffer> {
    // Dynamic import to avoid issues if pdfkit is not installed
    const PDFDocument = (await import('pdfkit')).default;

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('CDS Platform', { align: 'left' });
      doc.fontSize(10).text('Community Driven Services', { align: 'left' });
      doc.moveDown();

      // Invoice title
      doc.fontSize(16).text(`Invoice ${invoice.invoiceNumber}`, { align: 'right' });
      doc.fontSize(10).text(
        `Date: ${invoice.issuedAt ? new Date(invoice.issuedAt).toLocaleDateString('de-DE') : new Date().toLocaleDateString('de-DE')}`,
        { align: 'right' },
      );
      doc.moveDown(2);

      // From / To
      doc.fontSize(12).text('From:', { underline: true });
      doc.fontSize(10).text(invoice.providerName);
      if (invoice.providerAddress) doc.text(invoice.providerAddress);
      if (invoice.providerTaxId) doc.text(`Tax ID: ${invoice.providerTaxId}`);
      doc.moveDown();

      doc.fontSize(12).text('To:', { underline: true });
      doc.fontSize(10).text(invoice.customerName);
      if (invoice.customerAddress) doc.text(invoice.customerAddress);
      doc.moveDown(2);

      // Service description
      doc.fontSize(12).text('Service:', { underline: true });
      doc.fontSize(10).text(invoice.serviceDescription);
      if (invoice.serviceDate) {
        doc.text(
          `Service Date: ${new Date(invoice.serviceDate).toLocaleDateString('de-DE')}`,
        );
      }
      doc.moveDown(2);

      // Amounts table
      const formatAmount = (cents: number) => `\u20AC${(cents / 100).toFixed(2)}`;

      doc.fontSize(12).text('Amount Breakdown:', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10);
      doc.text(`Subtotal:                    ${formatAmount(invoice.subtotalAmount)}`);
      doc.text(
        `VAT (${invoice.vatRate}%):                    ${formatAmount(invoice.vatAmount)}`,
      );
      doc.text(
        `Platform Commission (${invoice.commissionRate}%):  ${formatAmount(invoice.commissionAmount)}`,
      );
      doc.moveDown(0.5);
      doc
        .fontSize(14)
        .text(`Total: ${formatAmount(invoice.totalAmount)}`, { underline: true });
      doc.moveDown(2);

      // Footer
      doc
        .fontSize(8)
        .text('Payment Terms: Due within 14 days of invoice date.', {
          align: 'center',
        })
        .text('CDS Platform \u2014 Community Driven Services', { align: 'center' });

      doc.end();
    });
  }
}
