import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Res,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { Response } from 'express';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { ProviderService } from '../services/provider.service';
import {
  CreateProviderDto,
  ListProvidersQueryDto,
  UploadDocumentDto,
  UpdateProviderStatusDto,
  VerifyDocumentDto,
} from '../dto/provider.dto';

@ApiTags('providers')
@Controller('providers')
export class ProviderController {
  constructor(private readonly providerService: ProviderService) {}

  @ApiOperation({ summary: 'Register a moving company (provider)' })
  @Roles('provider_owner')
  @Post()
  async create(@Body() dto: CreateProviderDto, @CurrentUser() user: AuthUser) {
    return this.providerService.create(dto, user.userId);
  }

  @ApiOperation({ summary: 'List provider companies with pagination' })
  @Get()
  async list(@Query() query: ListProvidersQueryDto) {
    return this.providerService.findMany(query);
  }

  @ApiOperation({ summary: 'Get provider company by ID' })
  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.providerService.findById(id);
  }

  // ─── Document Endpoints ─────────────────────────────────────────

  @ApiOperation({ summary: 'Upload a verification document (max 10 MB)' })
  @ApiConsumes('multipart/form-data')
  @Roles('provider_owner')
  @Post(':id/documents')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.providerService.uploadDocument(id, user.userId, file, dto.type);
  }

  @ApiOperation({ summary: 'List documents for a provider company' })
  @Get(':id/documents')
  async listDocuments(@Param('id', ParseUUIDPipe) id: string) {
    return this.providerService.listDocuments(id);
  }

  @ApiOperation({ summary: 'Download a document (binary stream)' })
  @Get(':id/documents/:documentId/download')
  async downloadDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Res() res: Response,
  ) {
    const { buffer, mimeType, filename } = await this.providerService.downloadDocument(
      id,
      documentId,
    );

    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      'Content-Length': buffer.length,
      'Cache-Control': 'private, no-cache',
    });
    res.send(buffer);
  }

  @ApiOperation({ summary: 'Delete a document (GDPR hard delete)' })
  @Roles('provider_owner', 'admin')
  @Delete(':id/documents/:documentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ) {
    await this.providerService.deleteDocument(id, documentId);
  }

  // ─── Admin Endpoints ────────────────────────────────────────────

  @ApiOperation({ summary: 'Admin: get provider with documents' })
  @Roles('admin')
  @Get(':id/admin')
  async adminDetail(@Param('id', ParseUUIDPipe) id: string) {
    return this.providerService.findByIdWithDocuments(id);
  }

  @ApiOperation({ summary: 'Admin: update provider status (approve/suspend/deactivate)' })
  @Roles('admin')
  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProviderStatusDto,
  ) {
    return this.providerService.updateStatus(id, dto.status, dto.reason);
  }

  @ApiOperation({ summary: 'Admin: verify or reject a document' })
  @Roles('admin')
  @Patch(':id/documents/:documentId/verify')
  async verifyDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Body() dto: VerifyDocumentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.providerService.verifyDocument(
      id,
      documentId,
      user.userId,
      dto.action,
      dto.rejectionReason,
    );
  }
}
