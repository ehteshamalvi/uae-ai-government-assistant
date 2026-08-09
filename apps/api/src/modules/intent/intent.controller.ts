import { Body, Controller, Get, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IntentService } from './intent.service';
import { AnalyzeIntentDto } from './dto/analyze-intent.dto';

@Controller('intent')
@Throttle({ default: { limit: 40, ttl: 60_000 } })
export class IntentController {
  constructor(private readonly intentService: IntentService) {}

  @Get('status')
  getStatus() {
    return {
      module: 'intent',
      status: 'ready',
      message: 'Intent analysis via MockIntentProvider (no OpenAI).',
    };
  }

  @Post('analyze')
  analyze(@Body() body: AnalyzeIntentDto) {
    return this.intentService.analyze(body);
  }
}
