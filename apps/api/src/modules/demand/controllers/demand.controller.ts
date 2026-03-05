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
import { DemandService } from '../services/demand.service';
import { CreateDemandDto } from '../dto/create-demand.dto';
import { ListDemandsQueryDto } from '../dto/list-demands.dto';

@ApiTags('demands')
@Controller('demands')
export class DemandController {
  constructor(private readonly demandService: DemandService) {}

  /**
   * POST /api/v1/demands
   * Create a new demand with full estate/transport data.
   *
   * MVP: userId extracted from stub guard (hardcoded).
   * Phase 2: from JWT token via @CurrentUser() decorator.
   */
  @ApiOperation({ summary: 'Create a new moving demand (Umzugsanfrage)' })
  @Roles('customer')
  @Post()
  async create(@Body() dto: CreateDemandDto, @CurrentUser() user: AuthUser) {
    return this.demandService.create(dto, user.userId);
  }

  /**
   * GET /api/v1/demands
   * List demands with pagination and optional filters.
   */
  @ApiOperation({ summary: 'List demands with pagination and filters' })
  @Get()
  async list(@Query() query: ListDemandsQueryDto) {
    return this.demandService.findMany({
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      status: query.status,
      customerUserId: query.customerUserId,
    });
  }

  @ApiOperation({ summary: 'Get demand by ID' })
  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.demandService.findById(id);
  }

  /**
   * PATCH /api/v1/demands/:id/cancel
   * Cancel a demand. Only the owning customer can cancel.
   */
  @ApiOperation({ summary: 'Cancel a demand (customer only)' })
  @Roles('customer')
  @Patch(':id/cancel')
  async cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.demandService.cancel(id, user.userId);
  }
}
