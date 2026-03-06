import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  NotFoundException,
  BusinessException,
} from '../../../common/exceptions/business.exception';
import { ErrorCode } from '../../../common/types/error-codes';
import {
  CreateProviderDto,
  ProviderResponseDto,
  ProviderDocumentResponseDto,
  PROVIDER_DOCUMENT_TYPES,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
} from '../dto/provider.dto';

/**
 * Provider company service — minimum CRUD stub.
 * Required for offer submit validation (providerCompanyId must exist).
 */
@Injectable()
export class ProviderService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Register a new provider company.
   */
  async create(
    dto: CreateProviderDto,
    userId: string,
  ): Promise<ProviderResponseDto> {
    const company = await this.prisma.$transaction(async (tx) => {
      const company = await tx.providerCompany.create({
        data: {
          ownerUserId: userId,
          name: dto.name,
          email: dto.email,
          phoneNumber: dto.phoneNumber,
          taxNumber: dto.taxNumber,
          status: 'PENDING', // Needs deposit before ACTIVE
          supportedPostCodePrefixes: dto.supportedPostCodePrefixes,
          createdBy: userId,
        },
      });

      await tx.providerAddress.create({
        data: {
          companyId: company.id,
          street: dto.address.street,
          houseNumber: dto.address.houseNumber,
          postCode: dto.address.postCode,
          placeName: dto.address.placeName,
          countryCode: dto.address.countryCode ?? 'DE',
        },
      });

      await tx.providerEmployee.create({
        data: {
          companyId: company.id,
          userId,
          role: 'OWNER',
          createdBy: userId,
        },
      });

      return company;
    });

    return this.toResponseDto(company);
  }

  /**
   * Get a provider company by ID.
   */
  async findById(id: string): Promise<ProviderResponseDto> {
    const company = await this.prisma.providerCompany.findFirst({
      where: { id, deletedAt: null },
    });

    if (!company) {
      throw new NotFoundException('ProviderCompany', id);
    }

    return this.toResponseDto(company);
  }

  /**
   * List provider companies with pagination.
   */
  async findMany(params: { page?: number; pageSize?: number; status?: string }) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const { status } = params;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { deletedAt: null };
    if (status) where.status = status;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.providerCompany.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.providerCompany.count({ where }),
    ]);

    return {
      items: items.map((c) => this.toResponseDto(c)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // ─── Document Management ───────────────────────────────────────────

  /**
   * Upload a document for a provider company.
   * GDPR: file stored as bytea in PostgreSQL. Cascade-deleted with company.
   */
  async uploadDocument(
    companyId: string,
    userId: string,
    file: { buffer: Buffer; mimetype: string; originalname: string; size: number },
    documentType: string,
  ): Promise<ProviderDocumentResponseDto> {
    // Validate company exists
    await this.findById(companyId);

    // Validate document type
    if (!PROVIDER_DOCUMENT_TYPES.includes(documentType as any)) {
      throw new BusinessException(
        ErrorCode.BIZ_INVALID_DOCUMENT_TYPE,
        `Invalid document type: ${documentType}. Allowed: ${PROVIDER_DOCUMENT_TYPES.join(', ')}`,
      );
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype as any)) {
      throw new BusinessException(
        ErrorCode.BIZ_INVALID_DOCUMENT_TYPE,
        `Invalid file type: ${file.mimetype}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    // Validate file size (10 MB)
    if (file.size > MAX_FILE_SIZE) {
      throw new BusinessException(
        ErrorCode.BIZ_DOCUMENT_TOO_LARGE,
        `File too large: ${(file.size / 1024 / 1024).toFixed(1)} MB. Max: 10 MB`,
      );
    }

    const doc = await this.prisma.providerDocument.create({
      data: {
        companyId,
        type: documentType,
        fileData: new Uint8Array(file.buffer),
        mimeType: file.mimetype,
        fileSize: file.size,
        originalFilename: file.originalname,
        createdBy: userId,
      },
    });

    return this.toDocumentResponseDto(doc);
  }

  /**
   * List documents for a provider company (metadata only, no file content).
   */
  async listDocuments(companyId: string): Promise<ProviderDocumentResponseDto[]> {
    const docs = await this.prisma.providerDocument.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
    return docs.map((d) => this.toDocumentResponseDto(d));
  }

  /**
   * Download a document's binary content.
   * Returns raw buffer + metadata for streaming response.
   */
  async downloadDocument(
    companyId: string,
    documentId: string,
  ): Promise<{ buffer: Buffer; mimeType: string; filename: string }> {
    const doc = await this.prisma.providerDocument.findFirst({
      where: { id: documentId, companyId },
    });

    if (!doc) {
      throw new NotFoundException('ProviderDocument', documentId);
    }

    return {
      buffer: Buffer.from(doc.fileData),
      mimeType: doc.mimeType,
      filename: doc.originalFilename,
    };
  }

  /**
   * Hard-delete a document (GDPR Art. 17 — right to erasure).
   */
  async deleteDocument(companyId: string, documentId: string): Promise<void> {
    const doc = await this.prisma.providerDocument.findFirst({
      where: { id: documentId, companyId },
    });

    if (!doc) {
      throw new NotFoundException('ProviderDocument', documentId);
    }

    await this.prisma.providerDocument.delete({ where: { id: documentId } });
  }

  // ─── Admin Operations ─────────────────────────────────────────────

  /** Valid status transitions for admin */
  private static readonly STATUS_TRANSITIONS: Record<string, string[]> = {
    PENDING: ['ACTIVE', 'SUSPENDED', 'DEACTIVATED'],
    ACTIVE: ['SUSPENDED', 'DEACTIVATED'],
    SUSPENDED: ['ACTIVE', 'DEACTIVATED'],
    DEACTIVATED: ['ACTIVE'],
  };

  /**
   * Admin: update provider company status.
   */
  async updateStatus(
    companyId: string,
    newStatus: string,
    reason?: string,
  ): Promise<ProviderResponseDto> {
    const company = await this.prisma.providerCompany.findFirst({
      where: { id: companyId, deletedAt: null },
    });

    if (!company) {
      throw new NotFoundException('ProviderCompany', companyId);
    }

    const allowed = ProviderService.STATUS_TRANSITIONS[company.status];
    if (!allowed || !allowed.includes(newStatus)) {
      throw new BusinessException(
        ErrorCode.BIZ_INVALID_STATUS_TRANSITION,
        `Cannot transition from ${company.status} to ${newStatus}`,
      );
    }

    const updated = await this.prisma.providerCompany.update({
      where: { id: companyId },
      data: { status: newStatus },
    });

    return this.toResponseDto(updated);
  }

  /**
   * Admin: verify or reject a document.
   */
  async verifyDocument(
    companyId: string,
    documentId: string,
    adminUserId: string,
    action: 'APPROVE' | 'REJECT',
    rejectionReason?: string,
  ): Promise<ProviderDocumentResponseDto> {
    const doc = await this.prisma.providerDocument.findFirst({
      where: { id: documentId, companyId },
    });

    if (!doc) {
      throw new NotFoundException('ProviderDocument', documentId);
    }

    const updated = await this.prisma.providerDocument.update({
      where: { id: documentId },
      data: {
        verified: action === 'APPROVE',
        verifiedAt: new Date(),
        verifiedBy: adminUserId,
        rejectionReason: action === 'REJECT' ? rejectionReason : null,
      },
    });

    return this.toDocumentResponseDto(updated);
  }

  /**
   * Get provider with documents (for admin detail view).
   */
  async findByIdWithDocuments(id: string): Promise<ProviderResponseDto> {
    const company = await this.prisma.providerCompany.findFirst({
      where: { id, deletedAt: null },
      include: { documents: true, address: true },
    });

    if (!company) {
      throw new NotFoundException('ProviderCompany', id);
    }

    const dto = this.toResponseDto(company);
    dto.documents = company.documents.map((d) => this.toDocumentResponseDto(d));
    return dto;
  }

  // ─── Private Helpers ──────────────────────────────────────────────

  private toDocumentResponseDto(doc: {
    id: string;
    companyId: string;
    type: string;
    mimeType: string;
    fileSize: number;
    originalFilename: string;
    verified: boolean;
    verifiedAt: Date | null;
    rejectionReason: string | null;
    createdAt: Date;
  }): ProviderDocumentResponseDto {
    return {
      id: doc.id,
      companyId: doc.companyId,
      type: doc.type,
      mimeType: doc.mimeType,
      fileSize: doc.fileSize,
      originalFilename: doc.originalFilename,
      verified: doc.verified,
      verifiedAt: doc.verifiedAt?.toISOString() ?? null,
      rejectionReason: doc.rejectionReason,
      createdAt: doc.createdAt.toISOString(),
    };
  }

  private toResponseDto(company: {
    id: string;
    ownerUserId: string;
    name: string;
    email: string;
    phoneNumber: string;
    taxNumber?: string;
    status: string;
    supportedPostCodePrefixes: string[];
    averageRating: number | null;
    reviewCount: number;
    completedJobCount: number;
    createdAt: Date;
  }): ProviderResponseDto {
    return {
      id: company.id,
      ownerUserId: company.ownerUserId,
      name: company.name,
      email: company.email,
      phoneNumber: company.phoneNumber,
      taxNumber: company.taxNumber,
      status: company.status,
      supportedPostCodePrefixes: company.supportedPostCodePrefixes,
      averageRating: company.averageRating,
      reviewCount: company.reviewCount,
      completedJobCount: company.completedJobCount,
      createdAt: company.createdAt.toISOString(),
    };
  }
}
