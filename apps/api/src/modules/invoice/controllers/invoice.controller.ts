import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { Roles } from '../../../common/decorators/roles.decorator';
import {
  CurrentUser,
  AuthUser,
} from '../../../common/decorators/current-user.decorator';
import { InvoiceService } from '../services/invoice.service';
import { CreateInvoiceDto, InvoiceQueryDto } from '../dto/invoice.dto';

@Controller('invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Roles('customer', 'provider_owner', 'admin')
  @Post()
  async create(@Body() dto: CreateInvoiceDto) {
    return this.invoiceService.createFromContract(dto.contractId);
  }

  @Roles('customer', 'provider_owner', 'admin')
  @Post(':id/issue')
  async issue(@Param('id') id: string) {
    return this.invoiceService.issue(id);
  }

  @Roles('admin')
  @Patch(':id/paid')
  async markPaid(@Param('id') id: string) {
    return this.invoiceService.markPaid(id);
  }

  @Roles('admin')
  @Patch(':id/cancel')
  async cancel(@Param('id') id: string) {
    return this.invoiceService.cancel(id);
  }

  @Roles('customer', 'provider_owner', 'admin')
  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Query() query: InvoiceQueryDto,
  ) {
    return this.invoiceService.findByUser(
      user.userId,
      query.page ?? '1',
      query.pageSize ?? '20',
      query.status,
    );
  }

  @Roles('admin')
  @Get('admin/all')
  async listAll(@Query() query: InvoiceQueryDto) {
    return this.invoiceService.findAll(
      query.page ?? '1',
      query.pageSize ?? '20',
      query.status,
    );
  }

  @Roles('customer', 'provider_owner', 'admin')
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.invoiceService.findById(id);
  }

  @Roles('customer', 'provider_owner', 'admin')
  @Get(':id/download')
  async download(@Param('id') id: string, @Res() res: Response) {
    const invoice = await this.invoiceService.findById(id);
    if (!invoice.downloadUrl) {
      return res
        .status(HttpStatus.NOT_FOUND)
        .json({ success: false, message: 'PDF not generated yet' });
    }
    return res.redirect(invoice.downloadUrl);
  }
}
