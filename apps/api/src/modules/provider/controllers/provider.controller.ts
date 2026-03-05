import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { ProviderService } from '../services/provider.service';
import { CreateProviderDto, ListProvidersQueryDto } from '../dto/provider.dto';

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
}
