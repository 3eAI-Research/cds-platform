import { Controller, Get, Post, Patch, Param, Query, Body } from '@nestjs/common';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { ChatService } from '../services/chat.service';
import { CreateChannelDto, SendMessageDto, ChatQueryDto } from '../dto/chat.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Roles('customer', 'provider_owner', 'admin')
  @Post('channels')
  async createChannel(@CurrentUser() user: AuthUser, @Body() dto: CreateChannelDto) {
    return this.chatService.createChannel(dto.demandId, user.userId, dto.providerUserId);
  }

  @Roles('customer', 'provider_owner', 'admin')
  @Get('channels')
  async listChannels(@CurrentUser() user: AuthUser, @Query() query: ChatQueryDto) {
    return this.chatService.getChannels(user.userId, query.page ?? '1', query.pageSize ?? '20');
  }

  @Roles('customer', 'provider_owner', 'admin')
  @Get('channels/:id/messages')
  async getMessages(
    @CurrentUser() user: AuthUser,
    @Param('id') channelId: string,
    @Query() query: ChatQueryDto,
  ) {
    return this.chatService.getMessages(channelId, user.userId, query.page ?? '1', query.pageSize ?? '50');
  }

  @Roles('customer', 'provider_owner', 'admin')
  @Post('channels/:id/messages')
  async sendMessage(
    @CurrentUser() user: AuthUser,
    @Param('id') channelId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(channelId, user.userId, dto.content, dto.attachmentKey);
  }

  @Roles('customer', 'provider_owner', 'admin')
  @Patch('channels/:id/read')
  async markRead(@CurrentUser() user: AuthUser, @Param('id') channelId: string) {
    return this.chatService.markRead(channelId, user.userId);
  }
}
