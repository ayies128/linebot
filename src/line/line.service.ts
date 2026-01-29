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

    // ルームID（送信元）の特定
    const roomLineId = source.groupId || source.roomId || source.userId;
    // ユーザーID（発信者）の特定
    const userLineId = source.userId;

    if (!roomLineId) {
      console.error('送信元IDが不明です:', event);
      return;
    }

    // 1. ルームを取得または作成
    let room = await this.prisma.room.findUnique({
      where: { lineRoomId: roomLineId },
    });

    if (!room) {
      room = await this.prisma.room.create({
        data: {
          lineRoomId: roomLineId,
          type: source.groupId ? 'group' : source.roomId ? 'room' : 'user',
        },
      });
    }

    // 2. ユーザーを取得または作成
    let user = null;
    if (userLineId) {
      user = await this.prisma.user.findUnique({
        where: { lineUserId: userLineId },
      });

      if (!user) {
        let displayName = 'Unknown User';
        let pictureUrl = null;

        try {
          const profile = await this.client.getProfile(userLineId);
          displayName = profile.displayName;
          pictureUrl = profile.pictureUrl;
        } catch (error) {
          console.warn('プロフィール取得に失敗しました:', error.message);
        }

        user = await this.prisma.user.create({
          data: {
            lineUserId: userLineId,
            displayName: displayName,
            pictureUrl: pictureUrl,
          },
        });
      }
    }

    // 3. メッセージを保存
    await this.prisma.message.create({
      data: {
        lineMessageId: message.id,
        roomId: room.id,
        userId: user ? user.id : null,
        messageType: message.type,
        textContent: message.text || null,
        rawContent: JSON.stringify(message),
        isFromUser: true,
      },
    });

    // 4. メッセージタイプに応じた処理
    if (message.type === 'text' && user) {
      // タスク抽出を試みる
      await this.taskService.extractAndCreateTask(user.id, message.text);
      // コマンド等のテキスト処理
      await this.handleTextMessage(replyToken, message.text, user, room);
    }
  }

  /**
   * テキストメッセージを処理
   */
  private async handleTextMessage(replyToken: string, text: string, user: any, room: any) {
    let replyMessage: TextMessage | null = null;

    // コマンド処理
    if (text.startsWith('/')) {
      replyMessage = await this.handleCommand(text, user);
    }

    // 返信がある場合のみ送信
    if (replyMessage) {
      try {
        await this.client.replyMessage(replyToken, replyMessage);

        // 送信したメッセージも保存
        await this.prisma.message.create({
          data: {
            roomId: room.id,
            userId: null, // システムからのメッセージとして保存
            messageType: 'text',
            textContent: replyMessage.text,
            rawContent: JSON.stringify(replyMessage),
            isFromUser: false,
          },
        });
      } catch (error) {
        console.error('メッセージ送信エラー:', error);
      }
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

      // ユーザーと個人用ルームを登録
      const user = await this.prisma.user.upsert({
        where: { lineUserId: userId },
        update: {
          displayName: profile.displayName,
          pictureUrl: profile.pictureUrl,
        },
        create: {
          lineUserId: userId,
          displayName: profile.displayName,
          pictureUrl: profile.pictureUrl,
        },
      });

      const room = await this.prisma.room.upsert({
        where: { lineRoomId: userId },
        update: {},
        create: {
          lineRoomId: userId,
          type: 'user',
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

      // 送信メッセージ保存
      await this.prisma.message.create({
        data: {
          roomId: room.id,
          userId: null,
          messageType: 'text',
          textContent: welcomeMessage.text,
          rawContent: JSON.stringify(welcomeMessage),
          isFromUser: false,
        },
      });

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
    console.log('ユーザーがアンフォローしました:', userId);
  }

  /**
   * プッシュメッセージを送信
   */
  async pushMessage(userId: string, message: TextMessage | FlexMessage) {
    try {
      await this.client.pushMessage(userId, message);
      console.log('プッシュメッセージを送信しました:', userId);

      // 送信メッセージをデータベースに保存
      // userId（宛先）をRoomIDとして使用
      const room = await this.prisma.room.findUnique({
        where: { lineRoomId: userId },
      });

      if (room) {
        await this.prisma.message.create({
          data: {
            roomId: room.id,
            userId: null, // システムからの送信
            messageType: message.type,
            textContent: (message as any).text || null,
            rawContent: JSON.stringify(message),
            isFromUser: false,
          },
        });
      }
    } catch (error) {
      console.error('プッシュメッセージ送信エラー:', error);
      throw error;
    }
  }
}
