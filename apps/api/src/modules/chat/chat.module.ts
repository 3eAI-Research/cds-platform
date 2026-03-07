import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ChatService } from './services/chat.service';
import { ChatController } from './controllers/chat.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
