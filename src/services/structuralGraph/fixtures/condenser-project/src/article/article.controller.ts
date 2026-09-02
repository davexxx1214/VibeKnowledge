import { Controller, Get } from '@nestjs/common';
import { ArticleService } from './article.service';

@Controller('articles')
export class ArticleController {
  constructor(private readonly articles: ArticleService) {}

  @Get()
  list(): unknown {
    return this.articles.list();
  }
}
