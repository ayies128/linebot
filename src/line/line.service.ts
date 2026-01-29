import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, ClientConfig, TextMessage, FlexMessage } from '@line/bot-sdk';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class LineService {
  private client: Client;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
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

    // 4. テキストメッセージの追加処理（コマンドなどが必要な場合）
    if (message.type === 'text' && user) {
      await this.handleTextMessage(replyToken, message.text, user, room);
    }
  }

  /**
   * テキストメッセージを処理
   */
  private async handleTextMessage(replyToken: string, text: string, user: any, room: any) {
    // 現在は自動応答なし。コマンドが必要な場合はここに追加。
    if (text === '/help') {
      const helpMessage: TextMessage = {
        type: 'text',
        text: 'このBotはLINEの会話履歴を自動でデータベースに保存しています。特別なコマンドはありません。',
      };
      await this.client.replyMessage(replyToken, helpMessage);
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

      // ウェルカムメッセージ
      const welcomeMessage: TextMessage = {
        type: 'text',
        text: `${profile.displayName}さん、友だち追加ありがとうございます！\n会話履歴の保存を開始します。`,
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

      const room = await this.prisma.room.findUnique({
        where: { lineRoomId: userId },
      });

      if (room) {
        await this.prisma.message.create({
          data: {
            roomId: room.id,
            userId: null,
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
