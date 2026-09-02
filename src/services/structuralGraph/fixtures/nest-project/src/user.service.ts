import { Injectable } from '@nestjs/common';
import { BaseService, UserPort } from '@app/contracts';

@Injectable()
export class UserService extends BaseService implements UserPort {
  find(id: string): string {
    return id;
  }
}
