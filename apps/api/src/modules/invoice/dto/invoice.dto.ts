import { IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateInvoiceDto {
  @IsUUID()
  contractId!: string;
}

export class InvoiceQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  pageSize?: string;
}
