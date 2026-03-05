import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { PaymentService } from '../services/payment.service';
import {
  CreatePaymentDto,
  CompletePaymentDto,
  ListPaymentsQueryDto,
} from '../dto/payment.dto';

@ApiTags('payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @ApiOperation({ summary: 'Create a payment record (MVP manual)' })
  @Post()
  async create(@Body() dto: CreatePaymentDto, @CurrentUser() user: AuthUser) {
    return this.paymentService.create(dto, user.userId);
  }

  @ApiOperation({ summary: 'List payments with pagination and filters' })
  @Get()
  async list(@Query() query: ListPaymentsQueryDto) {
    return this.paymentService.findMany({
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      status: query.status,
      type: query.type,
      contractId: query.contractId,
    });
  }

  @ApiOperation({ summary: 'Get payment by ID' })
  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentService.findById(id);
  }

  @ApiOperation({ summary: 'Mark payment as completed' })
  @Roles('admin', 'provider_owner')
  @Patch(':id/complete')
  async complete(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompletePaymentDto,
  ) {
    return this.paymentService.complete(id, dto.stripePaymentIntentId);
  }

  @ApiOperation({ summary: 'Mark payment as failed' })
  @Roles('admin')
  @Patch(':id/fail')
  async fail(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentService.fail(id);
  }

  @ApiOperation({ summary: 'Refund a completed payment' })
  @Roles('admin')
  @Patch(':id/refund')
  async refund(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentService.refund(id);
  }
}
