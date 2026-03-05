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
import { OfferService } from '../services/offer.service';
import { CreateOfferDto } from '../dto/create-offer.dto';
import { ListOffersQueryDto } from '../dto/list-offers.dto';

@ApiTags('offers')
@Controller('offers')
export class OfferController {
  constructor(private readonly offerService: OfferService) {}

  /**
   * POST /api/v1/offers
   * Submit an offer for a demand.
   */
  @ApiOperation({ summary: 'Submit an offer for a demand (provider)' })
  @Roles('provider_owner', 'provider_dispatcher')
  @Post()
  async submit(@Body() dto: CreateOfferDto, @CurrentUser() user: AuthUser) {
    return this.offerService.submit(dto, user.userId);
  }

  @ApiOperation({ summary: 'List offers with pagination and filters' })
  @Get()
  async list(@Query() query: ListOffersQueryDto) {
    return this.offerService.findMany({
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      demandId: query.demandId,
      status: query.status,
      providerCompanyId: query.providerCompanyId,
    });
  }

  @ApiOperation({ summary: 'Get offer by ID' })
  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.offerService.findById(id);
  }

  @ApiOperation({ summary: 'Accept an offer (customer) — triggers contract creation' })
  @Roles('customer')
  @Patch(':id/accept')
  async accept(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.offerService.accept(id, user.userId);
  }

  @ApiOperation({ summary: 'Reject an offer (customer)' })
  @Roles('customer')
  @Patch(':id/reject')
  async reject(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.offerService.reject(id, user.userId);
  }

  @ApiOperation({ summary: 'Withdraw an offer (provider)' })
  @Roles('provider_owner', 'provider_dispatcher')
  @Patch(':id/withdraw')
  async withdraw(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.offerService.withdraw(id, user.userId);
  }
}
