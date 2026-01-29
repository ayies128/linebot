import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from './database/database.module';
import { LineModule } from './line/line.module';
import { TaskModule } from './task/task.module';
import { SchedulerModule } from './scheduler/scheduler.module';

@Module({
  imports: [
    // 環境変数の読み込み
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // スケジューラー（実行基盤）
    ScheduleModule.forRoot(),
    // データベースモジュール
    DatabaseModule,
    // LINEモジュール
    LineModule,
    // タスクモジュール
    TaskModule,
    // スケジューラーモジュール（ビジネスロジック）
    SchedulerModule,
  ],
})
export class AppModule { }
