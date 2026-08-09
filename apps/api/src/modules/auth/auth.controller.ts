import { Controller, Get } from '@nestjs/common';

@Controller('auth')
export class AuthController {
  @Get('status')
  getStatus() {
    return {
      module: 'auth',
      status: 'ready',
      message:
        'Auth module placeholder — JWT authentication lands in a later phase.',
    };
  }
}
