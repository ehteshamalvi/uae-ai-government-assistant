import { Controller, Get } from '@nestjs/common';

@Controller('workflow')
export class WorkflowController {
  @Get('status')
  getStatus() {
    return {
      module: 'workflow',
      status: 'ready',
      message: 'Sandbox workflow module placeholder.',
    };
  }
}
