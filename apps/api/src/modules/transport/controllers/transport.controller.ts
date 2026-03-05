import { Controller, Post, Body, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { VolumeCalculatorService } from '../services/volume-calculator.service';
import { EstimateVolumeRequest } from '../dto/estimate-volume.dto';
import { parseAcceptLanguage } from '../services/locale.helper';

@ApiTags('transport')
@Controller('transport')
export class TransportController {
  constructor(
    private readonly volumeCalculatorService: VolumeCalculatorService,
  ) {}

  /**
   * POST /api/v1/transport/estimate-volume
   * Estimate loading volume (Ladevolumen) for a furniture list.
   * Public — used during demand creation before login.
   */
  @ApiOperation({ summary: 'Estimate loading volume (Ladevolumen) for furniture list' })
  @Public()
  @Post('estimate-volume')
  async estimateVolume(
    @Body() body: EstimateVolumeRequest,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    const locale = parseAcceptLanguage(acceptLanguage);
    return this.volumeCalculatorService.estimateVolume(body.items, locale);
  }
}
