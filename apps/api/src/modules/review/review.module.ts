import { Module } from '@nestjs/common';
import { ReviewController } from './controllers/review.controller';
import { ReviewService } from './services/review.service';

@Module({
  controllers: [ReviewController],
  providers: [ReviewService],
  exports: [ReviewService],
})
export class ReviewModule {}
