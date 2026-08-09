import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  getModuleName() {
    return 'users';
  }
}
