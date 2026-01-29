import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, INestApplication } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';

// Vercelデプロイ用のキャッシュ
let cachedApp: INestApplication;

async function bootstrap(): Promise<any> {
  if (!cachedApp) {
    const server = express();
    const app = await NestFactory.create(
      AppModule,
      new ExpressAdapter(server),
    );

    // グローバルバリデーションパイプ
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      transform: true,
    }));

    // CORS設定
    app.enableCors();

    await app.init();
    cachedApp = app;
  }
  return cachedApp.getHttpAdapter().getInstance();
}

// ローカル実行用
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  async function startLocal() {
    const app = await NestFactory.create(AppModule);
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      transform: true,
    }));
    app.enableCors();
    const port = process.env.PORT || 3000;
    await app.listen(port);
    console.log(`アプリケーションが起動しました: http://localhost:${port}`);
  }
  startLocal();
}

// Vercel向けのデフォルトエクスポート
export default async (req: any, res: any) => {
  const server = await bootstrap();
  server(req, res);
};
