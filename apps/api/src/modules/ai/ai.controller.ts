import { Body, Controller, Get, Post } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { AiService } from './ai.service';

class IntentPlaceholderDto {
  @IsString()
  @MinLength(1)
  text!: string;
}

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('status')
  getStatus() {
    return this.aiService.getStatus();
  }

  @Post('intent/placeholder')
  analyzeIntent(@Body() body: IntentPlaceholderDto) {
    return this.aiService.analyzeIntent(body.text);
  }
}
