# LINE Bot システム

NestJSを使用したLINE会話履歴の保存とタスク管理システムです。

## 概要

このシステムは、LINE Messaging APIを通じてメッセージを受信し、会話内容の保存やタスク管理のサポートを行います。

### 主な機能

- ✅ LINE Webhookによるメッセージ受信
- ✅ 会話履歴のデータベース保存
- ✅ 会話からのタスク抽出
- ✅ ユーザー管理

## 技術スタック

- **フレームワーク**: NestJS (TypeScript)
- **データベース**: Supabase (PostgreSQL)
- **ホスティング**: Vercel
- **ORM**: Prisma
- **主要API**: LINE Messaging API

## アーキテクチャ

```mermaid
graph LR
    LINE[LINE Platform] <--> Vercel[Vercel (NestJS)]
    Vercel --> Supabase[Supabase (PostgreSQL)]
```

## セットアップ

### 前提条件

- Node.js 18以上
- npm または yarn
- LINE Developersアカウント
- Supabaseアカウント
- Vercelアカウント

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd linebot
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 環境変数の設定

`.env.example`を`.env`にコピーして、必要な情報を入力します。

```bash
cp .env.example .env
```

以下の情報を設定してください：

- **LINE Messaging API**: [LINE Developers Console](https://developers.line.biz/console/)から取得
- **Supabase**: [Supabase Dashboard](https://app.supabase.com/)から取得

### 4. Prismaのセットアップ

```bash
# Prismaクライアントの生成
npx prisma generate

# データベースマイグレーション
# DATABASE_URLが必要です
npx prisma migrate dev --name init
```

### 5. ローカル開発サーバーの起動

```bash
npm run start:dev
```

### 6. ngrokでWebhookを公開（ローカル開発時）

```bash
# ngrokでポート3000を公開
ngrok http 3000
```

表示されたHTTPS URLをLINE Developers ConsoleのWebhook URLに設定してください（例: `https://xxxx.ngrok-free.app/webhook`）。

## デプロイ

### Vercelへのデプロイ

1. GitHubリポジトリと連携
2. Vercelで環境変数を設定
3. デプロイ実行

```bash
# Vercel CLIを使用する場合
npm i -g vercel
vercel --prod
```

### 環境変数の設定（Vercel）

Vercelダッシュボードで以下の環境変数を設定してください：

- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_CHANNEL_SECRET`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`

## プロジェクト構造

```text
linebot/
├── .agent/                    # AI設定ファイル
├── prisma/                    # Prismaスキーマ
│   └── schema.prisma
├── src/
│   ├── main.ts               # エントリーポイント
│   ├── app.module.ts         # ルートモジュール
│   ├── config/               # 設定ファイル
│   ├── common/               # 共通モジュール
│   ├── database/             # データベース接続
│   ├── line/                 # LINE連携
│   ├── task/                 # タスク管理
│   └── scheduler/            # スケジューラー
├── test/                     # テストファイル
├── .env.example              # 環境変数サンプル
├── .gitignore
├── package.json
├── tsconfig.json
├── vercel.json               # Vercel設定
└── README.md
```

## 使い方

### LINE Botコマンド

- `/tasks` - タスク一覧を表示
- `/settings` - 設定を表示
- `/help` - ヘルプメッセージを表示

## テスト

```bash
# ユニットテスト
npm run test

# E2Eテスト
npm run test:e2e
```

## ドキュメント

- [要件仕様書](./REQUIREMENTS.md)
- [実装計画](./implementation_plan.md)
- [開発ガイドライン](./.agent/ANTIGRAVITY.md)
- [セキュリティガイドライン](./SECURITY.md)

## ライセンス

MIT

## 参考リンク

- [NestJS Documentation](https://docs.nestjs.com/)
- [LINE Messaging API](https://developers.line.biz/ja/docs/messaging-api/)
- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
