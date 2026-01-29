# LINE Bot トラッカー (NestJS + Supabase + Vercel)

このプロジェクトは、LINE Messaging APIを活用した会話履歴の保存と、高度なタスク管理を自動化するシステムです。

## 🌟 プロジェクトの目的

LINEでの何気ない会話から「やるべきこと」を自動で抽出し、日々のタスク管理を劇的に楽にすることを目的としています。
Antigravity（AIアシスタント）とのペアプログラミングにより、迅速かつ安全に構築できるように設計されています。

## ✨ 主な機能

- **💬 会話履歴の自動保存**: LINEで送受信されたメッセージをすべてSupabaseに記録。
- **📝 AI/キーワードベースのタスク抽出**: 「TODO」「やること」「明日までに〜」といった表現から自動的にタスクを作成。
- **📅 期限の自動解析**: メッセージ内の日付表現（今日、明日、12/25など）を解析し、期限として設定。
- **📊 タスク統計 (`/stats`)**: 現在の進捗状況（完了率など）を即座に確認。
- **🔔 日次サマリー通知**: 毎朝9時に未完了タスクの一覧をLINEでプッシュ通知。

## 🛠 技術スタック

- **Framework**: NestJS (TypeScript)
- **Database**: Supabase (PostgreSQL)
- **ORM**: Prisma
- **Hosting**: Vercel
- **API**: LINE Messaging API
- **AI/Automation**: Antigravity (Advanced Agentic Coding)

## 🚀 セットアップ手順

誰でもAntigravityを使ってこのプロジェクトを再現・拡張できるように、以下の手順を整理しています。

### 1. 前提条件の準備（外部サービス）

以下のサービスのアカウントと設定が必要です：

- **LINE Developers**: Messaging APIチャネルを作成。「チャネルシークレット」と「チャネルアクセストークン」を取得。
- **Supabase**: プロジェクトを作成。`DATABASE_URL`（パスワード込み）を取得。
- **ngrok**: ローカル開発時のWebhook公開に使用。

### 2. リポジトリのクローンとインストール

```bash
git clone <your-repository-url>
cd linebot
npm install
```

### 3. 環境変数の設定

`.env.example` を `.env` にコピーし、取得したキーを設定します：

```env
LINE_CHANNEL_ACCESS_TOKEN=取得したトークン
LINE_CHANNEL_SECRET=取得したシークレット
DATABASE_URL=postgresql://postgres:[パスワード]@db.[プロジェクトID].supabase.co:5432/postgres
```

### 4. データベースの構築（Prisma）

```bash
# データベースにテーブルを作成
npm run prisma:migrate
```

### 5. アプリケーションの起動

```bash
# 開発サーバーの起動
npm run start:dev
```

### 6. Webhookの疎通確認

1. `ngrok http 3000` を実行。
2. 発行された `https://...` URLを、LINE Developersの「Webhook URL」に登録（末尾に `/webhook` を追加）。
3. LINEでボットに「TODO: テスト」と送って反応を確認。

## 🤖 Antigravityでの開発ガイド

このプロジェクトはAntigravityとの連携を前提としています。以下のファイルを AI が読み込むことで、文脈を理解したスムーズな開発が可能です。

- **[ANTIGRAVITY.md](.agent/ANTIGRAVITY.md)**: AI向けのプロジェクト方針、コーディング規約、セキュリティルール。
- **[REQUIREMENTS.md](REQUIREMENTS.md)**: システム全体の詳細な仕様書。
- **[walkthrough.md](walkthrough.md)**: これまでの実装履歴と現在のステータス。

## 🛡 セキュリティ

- **.env**: 機密情報は絶対にコミットされません（`.gitignore` で除外済み）。
- **Git Hooks**: `pre-commit` フックにより、誤って機密情報を含めたコミットをしようとすると警告・停止します。詳細は [SECURITY.md](SECURITY.md) を参照してください。

## 📄 ライセンス

MIT
