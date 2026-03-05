import { Controller, Get, Param, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { PostCodeService } from '../services/post-code.service';

@ApiTags('transport')
@Controller('post-codes')
export class PostCodeController {
  constructor(private readonly postCodeService: PostCodeService) {}

  /**
   * GET /api/v1/post-codes/:code
   * Lookup post codes by exact match or prefix.
   * Supports: "40" (prefix), "40210" (exact), "402" (partial)
   */
  @ApiOperation({ summary: 'Lookup German post codes (PLZ) by exact or prefix match' })
  @Public()
  @Get(':code')
  async findByCode(@Param('code') code: string) {
    // PLZ format: 2-5 digits only
    if (!/^\d{2,5}$/.test(code)) {
      throw new HttpException(
        'Invalid post code format. Expected 2-5 digits.',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.postCodeService.findByCode(code);
  }
}
