import { Controller, Post, Body, Headers, HttpException, HttpStatus } from '@nestjs/common';
import { LineService } from './line.service';
import * as crypto from 'crypto';

@Controller('webhook')
export class LineController {
  constructor(private readonly lineService: LineService) { }

  /**
   * LINE Webhookエンドポイント
   * LINEプラットフォームからのイベントを受信
   */
  @Post()
  async handleWebhook(
    @Body() body: any,
    @Headers('x-line-signature') signature: string,
  ) {
    // 署名検証
    if (!this.validateSignature(body, signature)) {
      throw new HttpException('署名が無効です', HttpStatus.UNAUTHORIZED);
    }

    // イベント処理
    const events = body.events || [];

    for (const event of events) {
      try {
        await this.lineService.handleEvent(event);
      } catch (error) {
        console.error('イベント処理エラー:', error);
      }
    }

    return { status: 'ok' };
  }

  /**
   * LINE署名検証
   */
  private validateSignature(body: any, signature: string): boolean {
    const channelSecret = process.env.LINE_CHANNEL_SECRET;
    if (!channelSecret) {
      console.error('LINE_CHANNEL_SECRETが設定されていません');
      return false;
    }

    const hash = crypto
      .createHmac('sha256', channelSecret)
      .update(JSON.stringify(body))
      .digest('base64');

    return hash === signature;
  }
}
