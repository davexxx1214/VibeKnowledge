import { Injectable } from '@nestjs/common';
import { createPool } from 'mysql2';

@Injectable()
export class DatabaseService {
  connect(): unknown {
    return createPool({});
  }
}
