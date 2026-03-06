import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import * as PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import { MovingPlan } from './plan-calculator.service';

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);
  private readonly reportsDir: string;

  constructor(private readonly prisma: PrismaService) {
    // Store reports in a local directory
    this.reportsDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  async generateReport(
    sessionId: string,
    userId: string,
    demandId: string | null,
    plan: MovingPlan,
    extractedData: Record<string, unknown>,
  ): Promise<{ reportId: string; downloadPath: string }> {
    // 1. Generate PDF
    const reportId = crypto.randomUUID();
    const fileName = `report-${reportId}.pdf`;
    const filePath = path.join(this.reportsDir, fileName);

    await this.createPdf(filePath, plan, extractedData);

    this.logger.log(`PDF report generated: ${fileName}`);

    // 2. Save to AgentReport table
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7-day expiry

    await this.prisma.agentReport.create({
      data: {
        id: reportId,
        sessionId,
        userId,
        demandId,
        planData: plan as any,
        pdfPath: filePath,
        expiresAt,
      },
    });

    this.logger.log(
      `AgentReport persisted: reportId=${reportId}, sessionId=${sessionId}`,
    );

    return { reportId, downloadPath: `/api/v1/reports/${reportId}/download` };
  }

  async getReportFile(
    reportId: string,
    userId: string,
  ): Promise<string | null> {
    const report = await this.prisma.agentReport.findUnique({
      where: { id: reportId },
    });

    if (!report || report.userId !== userId) {
      this.logger.warn(
        `Report access denied or not found: reportId=${reportId}, userId=${userId}`,
      );
      return null;
    }

    if (new Date() > report.expiresAt) {
      this.logger.warn(`Report expired: reportId=${reportId}`);
      return null;
    }

    if (!report.pdfPath || !fs.existsSync(report.pdfPath)) {
      this.logger.warn(`Report PDF file missing: reportId=${reportId}`);
      return null;
    }

    return report.pdfPath;
  }

  private createPdf(
    filePath: string,
    plan: MovingPlan,
    data: Record<string, unknown>,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Header
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('CDS Platform', { align: 'center' });
      doc.fontSize(14).text('Moving Project Plan', { align: 'center' });
      doc.moveDown(2);

      // Addresses
      doc.fontSize(12).font('Helvetica-Bold').text('Route');
      doc.font('Helvetica').fontSize(10);

      const fromData = data['from'] as Record<string, unknown> | undefined;
      const toData = data['to'] as Record<string, unknown> | undefined;
      const fromAddr = fromData?.['address'] as
        | Record<string, unknown>
        | undefined;
      const toAddr = toData?.['address'] as
        | Record<string, unknown>
        | undefined;

      if (fromAddr) {
        doc.text(
          `From: ${fromAddr['street'] ?? ''} ${fromAddr['houseNumber'] ?? ''}, ${fromAddr['postCode'] ?? ''} ${fromAddr['placeName'] ?? ''}`,
        );
      }
      if (toAddr) {
        doc.text(
          `To: ${toAddr['street'] ?? ''} ${toAddr['houseNumber'] ?? ''}, ${toAddr['postCode'] ?? ''} ${toAddr['placeName'] ?? ''}`,
        );
      }

      doc.text(`Distance: ${plan.route.distanceKm} km`);
      doc.text(`Driving time: ${plan.route.durationHours.toFixed(1)} hours`);
      doc.text(`Source: ${plan.route.source}`);
      doc.moveDown();

      // Volume & Vehicle
      doc.fontSize(12).font('Helvetica-Bold').text('Volume & Vehicle');
      doc.font('Helvetica').fontSize(10);
      doc.text(
        `Total volume: ${plan.volume.totalM3.toFixed(1)} m\u00B3 (${plan.volume.itemCount} items)`,
      );
      doc.text(`Vehicle: ${plan.vehicle.type} x ${plan.vehicle.count}`);
      doc.moveDown();

      // Crew
      doc.fontSize(12).font('Helvetica-Bold').text('Crew');
      doc.font('Helvetica').fontSize(10);
      doc.text(`Workers: ${plan.crew.workers}`);
      doc.text(`Drivers: ${plan.crew.drivers}`);
      doc.moveDown();

      // Timeline
      doc.fontSize(12).font('Helvetica-Bold').text('Timeline');
      doc.font('Helvetica').fontSize(10);

      for (const seg of plan.timeline.segments) {
        const mh = seg.manHours
          ? ` (${seg.manHours.toFixed(1)} man-hours)`
          : '';
        doc.text(
          `  ${seg.type}: ${seg.durationHours.toFixed(1)}h${mh}`,
        );
      }

      doc.moveDown();
      doc
        .font('Helvetica-Bold')
        .text(
          `Total duration: ${plan.timeline.totalDurationHours.toFixed(1)} hours`,
        );
      doc.text(`Total man-hours: ${plan.timeline.totalManHours.toFixed(1)}`);
      doc.text(`Multi-day move: ${plan.timeline.multiDay ? 'Yes' : 'No'}`);
      doc.moveDown();

      // Tolerance
      doc
        .fontSize(8)
        .font('Helvetica')
        .text(`Tolerance: ${plan.toleranceBand}`, { align: 'center' });
      doc.text('This is an estimate. Actual values may vary.', {
        align: 'center',
      });

      // Footer
      doc.moveDown(2);
      doc
        .fontSize(8)
        .text(`Generated: ${new Date().toISOString()}`, { align: 'right' });
      doc.text('CDS Platform — Community Driven Services', { align: 'right' });

      doc.end();
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
  }
}
