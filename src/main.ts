import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // グローバルバリデーションパイプ
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  // CORS設定
  app.enableCors();

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`アプリケーションが起動しました: http://localhost:${port}`);
}
bootstrap();
