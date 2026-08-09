import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkflowService {
  getModuleName() {
    return 'workflow';
  }
}
