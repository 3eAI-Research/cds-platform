import { Controller, Get, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { FurnitureTypeService } from '../services/furniture-type.service';
import { parseAcceptLanguage } from '../services/locale.helper';

@ApiTags('transport')
@Controller()
export class FurnitureTypeController {
  constructor(private readonly furnitureTypeService: FurnitureTypeService) {}

  /**
   * GET /api/v1/furniture-groups
   * List all furniture groups with their items.
   * Used by frontend for the room inventory step.
   */
  @ApiOperation({ summary: 'List all furniture groups with items' })
  @Public()
  @Get('furniture-groups')
  async findAllGroups(@Headers('accept-language') acceptLanguage?: string) {
    const locale = parseAcceptLanguage(acceptLanguage);
    return this.furnitureTypeService.findAllGroups(locale);
  }

  /**
   * GET /api/v1/furniture-types
   * List all furniture types (flat, without grouping).
   */
  @ApiOperation({ summary: 'List all furniture types (flat list)' })
  @Public()
  @Get('furniture-types')
  async findAll(@Headers('accept-language') acceptLanguage?: string) {
    const locale = parseAcceptLanguage(acceptLanguage);
    return this.furnitureTypeService.findAll(locale);
  }
}
