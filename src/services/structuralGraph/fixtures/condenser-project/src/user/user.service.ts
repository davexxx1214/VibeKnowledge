import { Injectable } from '@nestjs/common';

@Injectable()
export class UserService {
  find(): { id: number } {
    return { id: 1 };
  }
}
