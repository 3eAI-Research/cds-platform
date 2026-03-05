import { Controller, Get, Param, Headers, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { EstateTypeService } from '../services/estate-type.service';
import { parseAcceptLanguage } from '../services/locale.helper';
import { NotFoundException } from '../../../common/exceptions/business.exception';

@ApiTags('transport')
@Controller('estate-types')
export class EstateTypeController {
  constructor(private readonly estateTypeService: EstateTypeService) {}

  /**
   * GET /api/v1/estate-types
   * List all active estate types (Apartment, House, Office, Warehouse)
   */
  @ApiOperation({ summary: 'List all estate types (Apartment, House, Office, Warehouse)' })
  @Public()
  @Get()
  async findAll(@Headers('accept-language') acceptLanguage?: string) {
    const locale = parseAcceptLanguage(acceptLanguage);
    return this.estateTypeService.findAll(locale);
  }

  /**
   * GET /api/v1/estate-types/:id/parts
   * Get estate type with its valid room types.
   * Example: "Wohnung" → Wohnzimmer, Schlafzimmer, Küche, ...
   */
  @ApiOperation({ summary: 'Get estate type with valid room/part types' })
  @Public()
  @Get(':id/parts')
  async findWithParts(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    const locale = parseAcceptLanguage(acceptLanguage);
    const result = await this.estateTypeService.findWithParts(id, locale);

    if (!result) {
      throw new NotFoundException('EstateType', id);
    }

    return result;
  }
}
