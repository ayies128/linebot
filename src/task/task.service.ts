import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  constructor(private prisma: PrismaService) { }

  /**
   * メッセージ内容からタスクを抽出して保存する
   */
  async extractAndCreateTask(userId: string, text: string) {
    // 簡易的なタスク抽出ロジック
    // キーワード: "TODO", "やること", "あとで", "タスク"
    const taskKeywords = [/todo[:：\s]/i, /やること[:：\s]/, /タスク[:：\s]/];

    let isTask = false;
    let taskTitle = '';

    for (const pattern of taskKeywords) {
      if (pattern.test(text)) {
        isTask = true;
        taskTitle = text.replace(pattern, '').trim();
        break;
      }
    }

    // キーワードにマッチした場合のみタスク化
    if (isTask && taskTitle) {
      // 期限の抽出を試みる
      const dueDate = this.parseDueDate(taskTitle);

      // 期限表現（今日|明日|xx/xx）をタイトルから除去して整形
      const cleanedTitle = taskTitle.replace(/(今日|明日|(\d{1,2}[\/\-]\d{1,2}))(まで|に|の)?/, '').trim() || taskTitle;

      const task = await this.prisma.task.create({
        data: {
          userId,
          title: cleanedTitle,
          dueDate: dueDate,
          status: 'pending',
          priority: 1,
        },
      });
      this.logger.log(`タスクを抽出しました: ${task.title} (期限: ${dueDate ? dueDate.toLocaleDateString('ja-JP') : 'なし'})`);
      return task;
    }

    return null;
  }

  /**
   * タスクの統計情報を取得する
   */
  async getTaskStats(userId: string) {
    const totalTasks = await this.prisma.task.count({ where: { userId } });
    const completedTasks = await this.prisma.task.count({ where: { userId, status: 'completed' } });
    const pendingTasks = await this.prisma.task.count({ where: { userId, status: 'pending' } });

    return {
      total: totalTasks,
      completed: completedTasks,
      pending: pendingTasks,
      completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
    };
  }

  /**
   * 期限（dueDate）の抽出を試みる（簡易版）
   * 例: "明日まで", "2/1まで"
   */
  private parseDueDate(text: string): Date | null {
    const now = new Date();

    // 「今日」
    if (/今日/.test(text)) {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      return today;
    }

    // 「明日」
    if (/明日/.test(text)) {
      const tomorrow = new Date();
      tomorrow.setDate(now.getDate() + 1);
      tomorrow.setHours(23, 59, 59, 999);
      return tomorrow;
    }

    // 「MM/DD」または「M/D」形式
    const dateMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})/);
    if (dateMatch) {
      const month = parseInt(dateMatch[1]) - 1;
      const day = parseInt(dateMatch[2]);
      const targetDate = new Date(now.getFullYear(), month, day, 23, 59, 59, 999);

      // すでに過ぎている日付なら来年に設定
      if (targetDate < now) {
        targetDate.setFullYear(now.getFullYear() + 1);
      }
      return targetDate;
    }

    return null;
  }
}
