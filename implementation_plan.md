# LINE Bot 実装計画

NestJSを使用したLINE Bot WebhookアプリケーションをVercelにデプロイし、SupabaseをデータベースとしてLINE会話履歴の保存とタスク管理を行うシステムの実装計画です。

---

## 前提条件

### 必要なアカウント・設定

- [x] LINE Developersアカウント
- [x] LINE Messaging APIチャネルの作成
- [x] Supabaseプロジェクトの作成
- [ ] Vercelアカウントの作成

---

## Proposed Changes

### Phase 1: プロジェクト初期化とセットアップ

#### [DONE] NestJSプロジェクト初期化

- TypeScript設定、NestJS CLI設定の完了
- 必要な依存関係（@line/bot-sdk, @prisma/client, etc.）のインストール

#### [DONE] 環境変数設定

- `.env.example`および`.env`の作成
- LINEチャネル情報、Supabase接続情報の設定

#### [DONE] Vercel設定ファイル

- `vercel.json`の作成

---

### Phase 2: データベース設計とPrismaセットアップ

#### [DONE] Prismaスキーマ定義

- `User`, `Message`, `Task`モデルの定義
- Googleカレンダー関連フィールドの除外

#### [DONE] Prismaクライアント生成

- `npx prisma generate`の実行

---

### Phase 3: NestJSモジュール構成

#### [DONE] プロジェクト構造

- `src/main.ts`
- `src/app.module.ts`
- `src/database/` (PrismaService)
- `src/line/` (LineService, LineController)

---

### Phase 4: LINE Webhook実装

#### [DONE] LINE Controller & Service

- Webhook署名検証の実装
- メッセージ受信とデータベース保存
- 基本コマンド（/help, /tasks, /settings）の実装
- ユーザー自動登録フロー

---

### Phase 5: タスク管理機能の強化（Next Step）

#### [NEW] Task Service

- メッセージ内容からのタスク自動抽出ロジックの実装
- 自然言語処理を用いた期限（dueDate）の解析

---

### Phase 6: デプロイと検証

#### [NEW] Vercelデプロイ

- GitHub連携と環境変数の設定
- Webhook URLの最終設定

---

## Verification Plan

### Automated Tests

- `npm run test`: 署名検証、メッセージパースのユニットテスト
- `npm run build`: NestJSビルドチェック

### Manual Verification

1. **ngrokによるローカルテスト**: 実際のLINEメッセージが保存されるか確認
2. **Prisma Studio**: データベースに正しくデータが入っているか確認
3. **コマンドテスト**: `/tasks`コマンドで自分のタスクが表示されるか確認

---

## 次のステップ

1. [ ] Supabaseのデータベースパスワードを`.env`に設定
2. [ ] Prismaマイグレーション実行: `npm run prisma:migrate`
3. [ ] ngrokを使用してローカル環境でLINE実機テスト
4. [ ] メッセージからのタスク自動抽出ロジックの実装
5. [ ] Vercelへのデプロイ

---

> [!IMPORTANT]
> **セキュリティの徹底**
>
> - `.env`は絶対にコミットしない（pre-commitフックでブロック済み）
> - SupabaseのConnection Pooler（port 5432 or 6543）を使用する
