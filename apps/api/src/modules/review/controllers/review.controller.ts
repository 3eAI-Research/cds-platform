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
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { ReviewService } from '../services/review.service';
import { CreateReviewDto, ListReviewsQueryDto } from '../dto/review.dto';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @ApiOperation({ summary: 'Submit a review for a contract' })
  @Post()
  async create(@Body() dto: CreateReviewDto, @CurrentUser() user: AuthUser) {
    return this.reviewService.create(dto, user.userId);
  }

  @ApiOperation({ summary: 'List reviews with pagination and filters' })
  @Get()
  async list(@Query() query: ListReviewsQueryDto) {
    return this.reviewService.findMany({
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      contractId: query.contractId,
      revieweeUserId: query.revieweeUserId,
      direction: query.direction,
    });
  }

  @ApiOperation({ summary: 'Get review by ID' })
  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.reviewService.findById(id);
  }
}
