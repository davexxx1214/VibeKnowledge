import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { ArticleEntity } from './article.entity';

@Injectable()
export class ArticleService {
  constructor(private readonly users: UserService) {}

  list(): ArticleEntity[] {
    this.users.find();
    return [];
  }
}
