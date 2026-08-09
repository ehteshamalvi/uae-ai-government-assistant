import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  getModuleName() {
    return 'auth';
  }
}
