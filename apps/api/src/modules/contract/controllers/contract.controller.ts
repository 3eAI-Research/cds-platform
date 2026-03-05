import {
  Controller,
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
import { ContractService } from '../services/contract.service';
import { CancelContractDto, ListContractsQueryDto } from '../dto/contract.dto';

@ApiTags('contracts')
@Controller('contracts')
export class ContractController {
  constructor(private readonly contractService: ContractService) {}

  @ApiOperation({ summary: 'List my contracts with pagination' })
  @Get()
  async list(@Query() query: ListContractsQueryDto, @CurrentUser() user: AuthUser) {
    return this.contractService.findByUser({
      userId: user.userId,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      status: query.status,
    });
  }

  @ApiOperation({ summary: 'Get contract by ID' })
  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.contractService.findById(id);
  }

  @ApiOperation({ summary: 'Customer accepts contract' })
  @Roles('customer')
  @Patch(':id/customer-accept')
  async customerAccept(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.contractService.customerAccept(id, user.userId);
  }

  @ApiOperation({ summary: 'Provider accepts contract' })
  @Roles('provider_owner', 'provider_dispatcher')
  @Patch(':id/provider-accept')
  async providerAccept(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.contractService.providerAccept(id, user.userId);
  }

  @ApiOperation({ summary: 'Cancel a contract' })
  @Patch(':id/cancel')
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelContractDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.contractService.cancel(id, user.userId, dto.reason);
  }
}
