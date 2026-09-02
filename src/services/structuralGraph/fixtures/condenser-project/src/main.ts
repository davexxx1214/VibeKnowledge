import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

export async function bootstrap(): Promise<void> {
  await NestFactory.create(AppModule);
}

void bootstrap();
