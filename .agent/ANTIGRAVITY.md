# Antigravity AI 設定ファイル

## 言語設定

**重要**: すべての応答、思考プロセス、コメント、ドキュメントは**日本語**で記述してください。

- コード内のコメント: 日本語
- ドキュメント: 日本語
- コミットメッセージ: 日本語
- エラーメッセージ: 日本語
- ログ出力: 日本語

## プロジェクト概要

LINE Botによるタスク管理システムの開発。

### 技術スタック

- **フレームワーク**: NestJS (TypeScript)
- **デプロイ先**: Vercel
- **データベース**: Supabase (PostgreSQL)
- **主要API**: LINE Messaging API

### アーキテクチャ

```mermaid
[LINE Platform] ←→ [Vercel (NestJS Webhook)]
                              ↓
                    [Supabase (PostgreSQL)]
```

## 開発ガイドライン

### コーディング規約

1. **TypeScript**: 厳格な型定義を使用
2. **命名規則**:
   - ファイル名: kebab-case (例: `line-webhook.controller.ts`)
   - クラス名: PascalCase (例: `LineWebhookController`)
   - 関数名: camelCase (例: `handleWebhookEvent`)
   - 定数: UPPER_SNAKE_CASE (例: `MAX_RETRY_COUNT`)
3. **コメント**: 複雑なロジックには必ず日本語コメントを記載
4. **エラーハンドリング**: すべての非同期処理に適切なエラーハンドリングを実装

### 環境変数管理

- `.env`ファイルは`.gitignore`に追加
- `.env.example`にサンプルを記載
- Vercelの環境変数設定を使用
- 機密情報は絶対にコミットしない

### セキュリティ

1. **LINE Webhook署名検証**: すべてのWebhookリクエストで署名を検証
2. **環境変数**: 機密情報は環境変数で管理
3. **SQL Injection対策**: Prisma ORMを使用してパラメータ化クエリを実行
4. **CORS設定**: 必要最小限のオリジンのみ許可

### ⚠️ コミット前の必須チェック

**重要**: GitHubにpushする前に、以下を必ず確認してください。

#### 1. 機密情報の確認

```bash
# .envファイルが除外されているか確認
git check-ignore -v .env

# 期待される出力: .gitignore:5:.env       .env
# この出力が表示されればOK
```

#### 2. ステージングエリアの確認

```bash
# コミット対象ファイルを確認
git status

# .envファイルがリストに含まれていないことを確認
# もし含まれている場合は以下で除外:
git reset .env
```

#### 3. コミット前の最終チェック

```bash
# コミット予定のファイル内容を確認
git diff --cached

# 以下の情報が含まれていないか確認:
# - LINE_CHANNEL_ACCESS_TOKEN
# - LINE_CHANNEL_SECRET
# - SUPABASE_SERVICE_ROLE_KEY
# - DATABASE_URL（パスワード含む）
# - その他のAPIキーやトークン
```

#### 4. .gitignoreの確認

`.gitignore`に以下が含まれていることを確認:

```text
.env
.env.local
.env.*.local
.vercel
```

#### 5. 万が一機密情報をコミットしてしまった場合

```bash
# 最新のコミットを取り消す（まだpushしていない場合）
git reset --soft HEAD~1

# すでにpushしてしまった場合は、直ちに:
# 1. 該当のトークン/キーを無効化
# 2. 新しいトークン/キーを発行
# 3. Git履歴から完全に削除（git filter-branchまたはBFG Repo-Cleaner使用）
```

### 自動チェックの設定（推奨）

Git hooksを使用して自動チェックを設定することを推奨します:

```bash
# .git/hooks/pre-commit ファイルを作成
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash

# .envファイルがステージングされていないか確認
if git diff --cached --name-only | grep -q "^\.env$"; then
    echo "❌ エラー: .envファイルがコミットに含まれています"
    echo "機密情報を含むファイルはコミットできません"
    exit 1
fi

# 機密情報のパターンをチェック
if git diff --cached | grep -qE "(CHANNEL_ACCESS_TOKEN|CHANNEL_SECRET|SERVICE_ROLE_KEY|CLIENT_SECRET).*=.*[a-zA-Z0-9]{20,}"; then
    echo "⚠️  警告: 機密情報らしき文字列が検出されました"
    echo "コミット内容を確認してください"
    read -p "続行しますか？ (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "✅ セキュリティチェック完了"
exit 0
EOF

chmod +x .git/hooks/pre-commit
```

### テスト

- ユニットテスト: 各サービスクラスに対して実装
- E2Eテスト: 主要なエンドポイントに対して実装
- テストカバレッジ: 80%以上を目標

### デプロイメント

1. **ブランチ戦略**:
   - `main`: 本番環境
   - `develop`: 開発環境
   - `feature/*`: 機能開発ブランチ

2. **CI/CD**:
   - GitHubにpush時、Vercelが自動デプロイ
   - プレビュー環境は各PRごとに自動生成

## ディレクトリ構造

```text
linebot/
├── .agent/                    # AI設定ファイル
│   └── ANTIGRAVITY.md
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

## 優先事項

1. **セキュリティ**: 個人情報の適切な管理
2. **パフォーマンス**: Webhook応答は3秒以内
3. **保守性**: 読みやすく、拡張しやすいコード
4. **ドキュメント**: 適切なコメントとREADME

## 注意事項

- LINE Messaging APIの無料プランの制限に注意
- Vercelのサーバーレス関数の実行時間制限（10秒）に注意
- Supabaseの無料プランの制限に注意

## 参考リンク

- [NestJS Documentation](https://docs.nestjs.com/)
- [LINE Messaging API](https://developers.line.biz/ja/docs/messaging-api/)
- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
