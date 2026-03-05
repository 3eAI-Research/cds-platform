import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { NotificationService } from '../services/notification.service';
import { ListNotificationsQueryDto } from '../dto/notification.dto';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @ApiOperation({ summary: 'List my notifications with pagination' })
  @Get()
  async list(@Query() query: ListNotificationsQueryDto, @CurrentUser() user: AuthUser) {
    return this.notificationService.findByUser({
      userId: user.userId,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      unreadOnly: query.unreadOnly,
    });
  }

  @ApiOperation({ summary: 'Get notification by ID' })
  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.notificationService.findById(id);
  }

  @ApiOperation({ summary: 'Mark all notifications as read' })
  @Patch('read-all')
  async markAllAsRead(@CurrentUser() user: AuthUser) {
    return this.notificationService.markAllAsRead(user.userId);
  }

  @ApiOperation({ summary: 'Mark a notification as read' })
  @Patch(':id/read')
  async markAsRead(@Param('id', ParseUUIDPipe) id: string) {
    return this.notificationService.markAsRead(id);
  }
}
