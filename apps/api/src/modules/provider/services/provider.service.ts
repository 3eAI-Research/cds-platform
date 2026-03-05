import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotFoundException } from '../../../common/exceptions/business.exception';
import { CreateProviderDto, ProviderResponseDto } from '../dto/provider.dto';

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

  private toResponseDto(company: {
    id: string;
    ownerUserId: string;
    name: string;
    email: string;
    phoneNumber: string;
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
      status: company.status,
      supportedPostCodePrefixes: company.supportedPostCodePrefixes,
      averageRating: company.averageRating,
      reviewCount: company.reviewCount,
      completedJobCount: company.completedJobCount,
      createdAt: company.createdAt.toISOString(),
    };
  }
}
