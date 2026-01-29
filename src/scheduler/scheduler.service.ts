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
   * 毎日朝9時に未完了タスクのサマリーを送信する
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async handleDailyTaskSummary() {
    this.logger.log('日次タスクサマリーの送信を開始します...');

    const users = await this.prisma.user.findMany();

    for (const user of users) {
      const pendingTasks = await this.prisma.task.findMany({
        where: {
          userId: user.id,
          status: 'pending',
        },
        orderBy: {
          priority: 'desc',
        },
        take: 5,
      });

      if (pendingTasks.length > 0) {
        const taskList = pendingTasks
          .map((task, index) => `${index + 1}. ${task.title}`)
          .join('\n');

        const message = {
          type: 'text',
          text: `【おはようございます！☀️】\n今日の未完了タスクはこちらです：\n\n${taskList}\n\n今日も一日頑張りましょう！`,
        };

        try {
          await this.lineService.pushMessage(user.lineUserId, message as any);
        } catch (error) {
          this.logger.error(`ユーザー ${user.displayName} への送信に失敗しました`, error);
        }
      }
    }
  }

  /**
   * 15分ごとにリマインダーをチェックする（将来的な拡張用）
   */
  @Cron(CronExpression.EVERY_15_MINUTES)
  async checkReminders() {
    // 期限が近いタスクなどの通知ロジックをここに実装
  }
}
