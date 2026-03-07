import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Query,
  Res,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFiles,
  HttpStatus,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { AgentService } from '../services/agent.service';
import { ReportService } from '../services/report.service';
import { SendMessageDto } from '../dto/agent.dto';
import { BusinessException } from '../../../common/exceptions/business.exception';
import { ErrorCode } from '../../../common/types/error-codes';

@ApiTags('Agent')
@Controller('agent')
export class AgentController {
  constructor(
    private readonly agentService: AgentService,
    private readonly reportService: ReportService,
  ) {}

  /**
   * GET /api/v1/agent/admin/sessions
   * List all agent sessions (admin only).
   */
  @ApiOperation({ summary: 'List all agent sessions (admin)' })
  @Roles('admin')
  @Get('admin/sessions')
  async getAdminSessions(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.agentService.getAllSessions(page ?? 1, pageSize ?? 50);
  }

  /**
   * POST /api/v1/agent/sessions
   * Create a new AI assistant session.
   */
  @ApiOperation({ summary: 'Create a new AI assistant session' })
  @Throttle({ short: { ttl: 10000, limit: 2 }, medium: { ttl: 60000, limit: 10 } })
  @Roles('customer')
  @Post('sessions')
  async createSession(@CurrentUser() user: AuthUser) {
    return this.agentService.createSession(user.userId);
  }

  /**
   * POST /api/v1/agent/sessions/:id/messages
   * Send a message to the AI assistant.
   */
  @ApiOperation({ summary: 'Send a message to the AI assistant' })
  @Throttle({ short: { ttl: 5000, limit: 1 }, medium: { ttl: 60000, limit: 15 } })
  @Roles('customer')
  @Post('sessions/:id/messages')
  async sendMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.agentService.sendMessage(id, user.userId, dto.content);
  }

  /**
   * POST /api/v1/agent/sessions/:id/photos
   * Upload photos for furniture detection.
   */
  @ApiOperation({ summary: 'Upload photos for AI furniture detection' })
  @ApiConsumes('multipart/form-data')
  @Roles('customer')
  @UseInterceptors(
    FilesInterceptor('photos', 10, {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per file
      fileFilter: (_req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BusinessException(
              ErrorCode.BUS_PHOTO_INVALID_TYPE,
              `Invalid file type: ${file.mimetype}. Allowed: ${allowedMimes.join(', ')}`,
              HttpStatus.BAD_REQUEST,
            ),
            false,
          );
        }
      },
    }),
  )
  @Post('sessions/:id/photos')
  async uploadPhotos(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: AuthUser,
  ) {
    if (!files || files.length === 0) {
      throw new BusinessException(
        ErrorCode.VAL_REQUIRED_FIELD,
        'At least one photo is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const photos = files.map((f) => ({
      buffer: f.buffer,
      mimeType: f.mimetype,
    }));

    return this.agentService.uploadPhotos(id, user.userId, photos);
  }

  /**
   * POST /api/v1/agent/sessions/:id/confirm
   * Confirm and create a demand from the session data.
   */
  @ApiOperation({ summary: 'Confirm and create demand from session' })
  @Roles('customer')
  @Post('sessions/:id/confirm')
  async confirmDemand(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.agentService.confirmDemand(id, user.userId);
  }

  /**
   * POST /api/v1/agent/sessions/:id/plan
   * Calculate moving plan and generate report.
   */
  @ApiOperation({ summary: 'Calculate moving plan and generate PDF report' })
  @Throttle({ short: { ttl: 30000, limit: 1 }, medium: { ttl: 300000, limit: 3 } })
  @Roles('customer')
  @Post('sessions/:id/plan')
  async calculatePlan(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.agentService.calculatePlan(id, user.userId);
  }

  /**
   * GET /api/v1/agent/sessions/:id
   * Get current session state.
   */
  @ApiOperation({ summary: 'Get current session state' })
  @Roles('customer')
  @Get('sessions/:id')
  async getSession(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.agentService.getSession(id, user.userId);
  }

  /**
   * DELETE /api/v1/agent/sessions/:id
   * Cancel a session.
   */
  @ApiOperation({ summary: 'Cancel an AI assistant session' })
  @Roles('customer')
  @Delete('sessions/:id')
  async cancelSession(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.agentService.cancelSession(id, user.userId);
    return { message: 'Session cancelled' };
  }

  /**
   * GET /api/v1/agent/reports/:id/download
   * Download a generated PDF report.
   */
  @ApiOperation({ summary: 'Download a generated PDF report' })
  @Roles('customer')
  @Get('reports/:id/download')
  async downloadReport(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    const filePath = await this.reportService.getReportFile(id, user.userId);

    if (!filePath) {
      throw new BusinessException(
        ErrorCode.NOT_FOUND,
        'Report not found or expired',
        HttpStatus.NOT_FOUND,
      );
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="moving-report-${id}.pdf"`,
    );
    res.sendFile(filePath);
  }
}
