import { Module } from '@nestjs/common';
import { ArticleModule } from './article/article.module';
import { DatabaseModule } from './infrastructure/database.module';
import { TagModule } from './tag/tag.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [ArticleModule, DatabaseModule, TagModule, UserModule],
})
export class AppModule {}
