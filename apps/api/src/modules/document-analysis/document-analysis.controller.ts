import { Controller, Get, Param, Post } from '@nestjs/common';
import { DocumentAnalysisService } from './document-analysis.service';
import {
  CurrentUser,
  type RequestUser,
} from '../../common/decorators/auth.decorators';

@Controller('documents')
export class DocumentAnalysisController {
  constructor(private readonly analysisService: DocumentAnalysisService) {}

  @Post(':id/analyze')
  analyze(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.analysisService.analyze(user, id);
  }

  @Get(':id/analysis')
  getAnalysis(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.analysisService.getAnalysis(user, id);
  }
}
