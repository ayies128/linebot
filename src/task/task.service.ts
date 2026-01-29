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

    // "〜する" や "〜した" などから抽出する高度なロジックは後のフェーズで検討
    // 現時点ではキーワードにマッチした場合のみタスク化
    if (isTask && taskTitle) {
      const task = await this.prisma.task.create({
        data: {
          userId,
          title: taskTitle,
          status: 'pending',
          priority: 1, // デフォルトで中
        },
      });
      this.logger.log(`タスクを抽出しました: ${task.title} (User: ${userId})`);
      return task;
    }

    return null;
  }

  /**
   * 期限（dueDate）の抽出を試みる（簡易版）
   * 例: "明日まで", "2/1まで"
   */
  private parseDueDate(text: string): Date | null {
    const now = new Date();
    if (text.includes('明日')) {
      const tomorrow = new Date();
      tomorrow.setDate(now.getDate() + 1);
      return tomorrow;
    }
    if (text.includes('今日')) {
      return now;
    }
    // TODO: 正則表現による日付抽出の強化
    return null;
  }
}
