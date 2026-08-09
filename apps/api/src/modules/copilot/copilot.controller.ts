import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  CopilotService,
  CreateSessionDto,
  SendMessageDto,
} from './copilot.service';
import {
  CurrentUser,
  type RequestUser,
} from '../../common/decorators/auth.decorators';

@Controller('copilot')
@Throttle({ default: { limit: 30, ttl: 60_000 } })
export class CopilotController {
  constructor(private readonly copilotService: CopilotService) {}

  @SkipThrottle()
  @Get('status')
  getStatus() {
    return {
      module: this.copilotService.getModuleName(),
      status: 'ready',
      message:
        'Context-aware Copilot with Mock AI + demo knowledge retrieval (AI_PROVIDER=mock).',
    };
  }

  @Post('sessions')
  createSession(
    @CurrentUser() user: RequestUser,
    @Body() body: CreateSessionDto,
  ) {
    return this.copilotService.createSession(user, body);
  }

  @Get('sessions')
  listSessions(@CurrentUser() user: RequestUser) {
    return this.copilotService.listSessions(user);
  }

  @Get('sessions/:id')
  getSession(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.copilotService.getSession(user, id);
  }

  @Post('sessions/:id/messages')
  sendMessage(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: SendMessageDto,
  ) {
    return this.copilotService.sendMessage(user, id, body);
  }
}
