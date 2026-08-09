import { Controller, Get, Param, Patch } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import {
  CurrentUser,
  type RequestUser,
} from '../../common/decorators/auth.decorators';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('status')
  getStatus() {
    return {
      module: 'notifications',
      status: 'ready',
      message: 'In-app sandbox notifications (no email/SMS).',
    };
  }

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.notificationsService.list(user);
  }

  @Patch(':id/read')
  markRead(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.notificationsService.markRead(user, id);
  }
}
