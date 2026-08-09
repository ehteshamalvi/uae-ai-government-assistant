import { Controller, Get } from '@nestjs/common';

@Controller('users')
export class UsersController {
  @Get('status')
  getStatus() {
    return {
      module: 'users',
      status: 'ready',
      message: 'Users module placeholder.',
    };
  }
}
