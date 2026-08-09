import { Controller, Get } from '@nestjs/common';

@Controller('audit')
export class AuditController {
  @Get('status')
  getStatus() {
    return {
      module: 'audit',
      status: 'ready',
      message: 'Audit module placeholder.',
    };
  }
}
