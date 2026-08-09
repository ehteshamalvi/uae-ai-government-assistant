import { Controller, Get } from '@nestjs/common';

@Controller('roles')
export class RolesController {
  @Get('status')
  getStatus() {
    return {
      module: 'roles',
      status: 'ready',
      message: 'Roles module placeholder.',
    };
  }
}
