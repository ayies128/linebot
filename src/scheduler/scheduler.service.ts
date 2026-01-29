import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { LineService } from '../line/line.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private prisma: PrismaService,
    private lineService: LineService,
  ) { }

  /**
   * 毎日朝9時に活動開始メッセージを送信する（現在はタスクがないためメッセージのみ）
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async handleDailyGreeting() {
    this.logger.log('日次挨拶の送信を開始します...');

    const users = await this.prisma.user.findMany();

    for (const user of users) {
      const message = {
        type: 'text',
        text: `【おはようございます！☀️】\n今日も一日頑張りましょう！`,
      };

      try {
        await this.lineService.pushMessage(user.lineUserId, message as any);
      } catch (error) {
        this.logger.error(`ユーザー ${user.displayName} への送信に失敗しました`, error);
      }
    }
  }

  /**
   * 30分ごとの定期チェック（将来的な拡張用）
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async checkStatus() {
    // サーバーの死活監視や定期処理をここに実装可能
  }
}
