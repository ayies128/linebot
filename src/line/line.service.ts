import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, ClientConfig, TextMessage, FlexMessage } from '@line/bot-sdk';
import { PrismaService } from '../database/prisma.service';
import { TaskService } from '../task/task.service';

@Injectable()
export class LineService {
  private client: Client;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private taskService: TaskService,
  ) {
    const config: ClientConfig = {
      channelAccessToken: this.configService.get<string>('LINE_CHANNEL_ACCESS_TOKEN') || '',
      channelSecret: this.configService.get<string>('LINE_CHANNEL_SECRET') || '',
    };
    this.client = new Client(config);
  }

  /**
   * LINEイベントを処理
   */
  async handleEvent(event: any) {
    console.log('受信イベント:', JSON.stringify(event, null, 2));

    switch (event.type) {
      case 'message':
        await this.handleMessageEvent(event);
        break;
      case 'follow':
        await this.handleFollowEvent(event);
        break;
      case 'unfollow':
        await this.handleUnfollowEvent(event);
        break;
      default:
        console.log('未対応のイベントタイプ:', event.type);
    }
  }

  /**
   * メッセージイベントを処理
   */
  private async handleMessageEvent(event: any) {
    const { replyToken, source, message } = event;
    // 優先順位: userId > groupId > roomId
    const lineId = source.userId || source.groupId || source.roomId;

    if (!lineId) {
      console.error('送信元IDが不明です:', event);
      return;
    }

    // ユーザーを取得または作成
    let user = await this.prisma.user.findUnique({
      where: { lineUserId: lineId },
    });

    if (!user) {
      // 新規ユーザーの場合、プロフィール情報の取得を試みる
      let displayName = 'Unknown User';
      let pictureUrl = null;

      try {
        // userIdがある場合のみプロフィール取得可能
        if (source.userId) {
          const profile = await this.client.getProfile(source.userId);
          displayName = profile.displayName;
          pictureUrl = profile.pictureUrl;
        } else if (source.groupId) {
          displayName = `Group (${source.groupId.substring(0, 8)})`;
        } else if (source.roomId) {
          displayName = `Room (${source.roomId.substring(0, 8)})`;
        }

        user = await this.prisma.user.create({
          data: {
            lineUserId: lineId,
            displayName: displayName,
            pictureUrl: pictureUrl,
          },
        });
        console.log('新規ユーザー/グループを登録しました:', user.displayName);
      } catch (error) {
        console.error('ユーザー登録エラー（フォールバック実行）:', error);
        // プロフィール取得に失敗してもIDだけで登録を強行
        user = await this.prisma.user.create({
          data: {
            lineUserId: lineId,
            displayName: displayName,
          },
        });
      }
    }

    // メッセージを保存
    await this.prisma.message.create({
      data: {
        userId: user.id,
        messageType: message.type,
        content: JSON.stringify(message),
        replyToken: replyToken,
        isFromUser: true,
      },
    });

    // メッセージタイプに応じた処理
    if (message.type === 'text') {
      // タスク抽出を試みる
      await this.taskService.extractAndCreateTask(user.id, message.text);

      await this.handleTextMessage(replyToken, message.text, user);
    }
  }

  /**
   * テキストメッセージを処理
   */
  private async handleTextMessage(replyToken: string, text: string, user: any) {
    let replyMessage: TextMessage;

    // コマンド処理
    if (text.startsWith('/')) {
      replyMessage = await this.handleCommand(text, user);
    } else {
      // 通常のメッセージ応答
      replyMessage = {
        type: 'text',
        text: `メッセージを受信しました: ${text}`,
      };
    }

    // 返信
    try {
      await this.client.replyMessage(replyToken, replyMessage);

      // 送信したメッセージも保存
      await this.prisma.message.create({
        data: {
          userId: user.id,
          messageType: 'text',
          content: JSON.stringify(replyMessage),
          isFromUser: false,
        },
      });
    } catch (error) {
      console.error('メッセージ送信エラー:', error);
    }
  }

  /**
   * コマンドを処理
   */
  private async handleCommand(command: string, user: any): Promise<TextMessage> {
    const cmd = command.toLowerCase().split(' ')[0];

    switch (cmd) {
      case '/help':
        return {
          type: 'text',
          text: `【利用可能なコマンド】\n\n` +
            `/help - このヘルプを表示\n` +
            `/tasks - タスク一覧を表示\n` +
            `/stats - タスク統計を表示\n` +
            `/settings - 設定メニューを表示`,
        };

      case '/stats':
        const stats = await this.taskService.getTaskStats(user.id);
        return {
          type: 'text',
          text: `【タスク統計】\n\n` +
            `全タスク: ${stats.total}\n` +
            `完了済み: ${stats.completed}\n` +
            `未完了: ${stats.pending}\n` +
            `完了率: ${stats.completionRate.toFixed(1)}%`,
        };

      case '/tasks':
        // データベースからタスクを取得
        const tasks = await this.prisma.task.findMany({
          where: { userId: user.id, status: { not: 'completed' } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        });

        if (tasks.length === 0) {
          return {
            type: 'text',
            text: 'タスクはありません',
          };
        }

        const taskList = tasks.map((task, index) =>
          `${index + 1}. ${task.title}${task.dueDate ? ` (期限: ${task.dueDate.toLocaleDateString('ja-JP')})` : ''}`
        ).join('\n');

        return {
          type: 'text',
          text: `【タスク一覧】\n\n${taskList}`,
        };

      case '/settings':
        return {
          type: 'text',
          text: `【現在の設定】\n\n` +
            `タイムゾーン: ${user.timezone}\n` +
            `設定変更機能は実装中です`,
        };

      default:
        return {
          type: 'text',
          text: `不明なコマンドです: ${cmd}\n/help でコマンド一覧を確認できます`,
        };
    }
  }

  /**
   * フォローイベントを処理
   */
  private async handleFollowEvent(event: any) {
    const userId = event.source.userId;

    try {
      const profile = await this.client.getProfile(userId);

      // ユーザーを登録
      const user = await this.prisma.user.create({
        data: {
          lineUserId: userId,
          displayName: profile.displayName,
          pictureUrl: profile.pictureUrl,
        },
      });

      // ウェルカムメッセージを送信
      const welcomeMessage: TextMessage = {
        type: 'text',
        text: `${profile.displayName}さん、友だち追加ありがとうございます！\n\n` +
          `このBotは、LINEでの会話履歴を保存し、タスク管理をサポートします。\n\n` +
          `/help でコマンド一覧を確認できます。`,
      };


      await this.client.replyMessage(event.replyToken, welcomeMessage);
      console.log('新規フォロー:', profile.displayName);
    } catch (error) {
      console.error('フォローイベント処理エラー:', error);
    }
  }

  /**
   * アンフォローイベントを処理
   */
  private async handleUnfollowEvent(event: any) {
    const userId = event.source.userId;

    // ユーザー情報は削除せず、ログのみ記録
    console.log('ユーザーがアンフォローしました:', userId);
  }

  /**
   * プッシュメッセージを送信
   */
  async pushMessage(userId: string, message: TextMessage | FlexMessage) {
    try {
      await this.client.pushMessage(userId, message);
      console.log('プッシュメッセージを送信しました:', userId);
    } catch (error) {
      console.error('プッシュメッセージ送信エラー:', error);
      throw error;
    }
  }
}
