import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from './database/database.module';
import { LineModule } from './line/line.module';

@Module({
  imports: [
    // 環境変数の読み込み
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // スケジューラーモジュール
    ScheduleModule.forRoot(),
    // データベースモジュール
    DatabaseModule,
    // LINEモジュール
    LineModule,
  ],
})
export class AppModule { }
