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
    const userId = source.userId;

    // ユーザーを取得または作成
    let user = await this.prisma.user.findUnique({
      where: { lineUserId: userId },
    });

    if (!user) {
      // 新規ユーザーの場合、プロフィール情報を取得して登録
      try {
        const profile = await this.client.getProfile(userId);
        user = await this.prisma.user.create({
          data: {
            lineUserId: userId,
            displayName: profile.displayName,
            pictureUrl: profile.pictureUrl,
          },
        });
        console.log('新規ユーザーを登録しました:', user.displayName);
      } catch (error) {
        console.error('ユーザー登録エラー:', error);
        return;
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
            `/settings - 設定メニューを表示`,
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
