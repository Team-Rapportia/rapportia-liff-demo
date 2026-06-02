# デプロイ手順（Step 2〜5）

> ⚠️ **2026-06-01 更新**: このデモ（`rapportia-liff-demo`）の予約保存先は **Supabase（無ければメモリ）** に変更済み（[Supabase 完全移行決定](https://github.com/Team-Rapportia/team-rapportia/blob/main/strategy/13_予約バックエンドの選定（Supabase決定）.md)）。本ガイドの **Step 4「ConoHa WING + Amelia」は本番テンプレ `rapportia-liff` 用**で、デモのデプロイには不要（読み飛ばし可）。Supabase の設定は README とマイグレーション（`supabase/migrations/`）を参照。

`npm install` が終わった後にやる、各外部サービスのセットアップ手順。
**LINE → Stripe → Amelia → Vercel** の順で進めるのが最短。

---

## Step 2: LINE Developers Console（LIFF + Messaging API）

### 2-A. プロバイダー作成（初回のみ）

1. https://developers.line.biz/ にアクセス → 自分の LINE アカウントでログイン
2. 「コンソールに移動」 → 「プロバイダー作成」
3. プロバイダー名: `Team Rapportia`

### 2-B. LINEログインチャネル作成（LIFF用）

1. 作ったプロバイダーをクリック → 「新規チャネル作成」 → **「LINEログイン」** を選ぶ
2. 入力:
   - チャネル名: `ラポーティアケーキ予約` （顧客名に合わせる）
   - チャネル説明: 任意
   - アプリタイプ: **ウェブアプリ** にチェック
   - メールアドレス: 自分のメール
3. 作成後、画面上部に「Channel ID」が表示される → **メモ → `LINE_LOGIN_CHANNEL_ID`**

### 2-C. LIFFアプリ追加

1. 同じチャネル内の「LIFF」タブ → 「追加」
2. 入力:
   - LIFFアプリ名: `予約フォーム`
   - サイズ: **Full**
   - エンドポイントURL: 仮で `https://example.com/` （Vercel デプロイ後に書き換え）
   - Scope: **profile** と **openid** をオン
   - ボットリンク機能（友だち追加オプション）: **On (Aggressive)** ← push 通知（予約完了メッセージ）を確実に届けるため
3. 作成すると「LIFF ID」（例: `1234567890-AbCdEfGh`）が表示 → **メモ → `NEXT_PUBLIC_LIFF_ID`**

### 2-D. Messaging API チャネル作成（通知送信用）

1. 同プロバイダーで「新規チャネル作成」 → **「Messaging API」** を選ぶ
2. チャネル名: `ラポーティアケーキ通知`
3. 作成後「Messaging API設定」タブ:
   - 「チャネルアクセストークン（長期）」を発行 → **メモ → `LINE_MESSAGING_CHANNEL_ACCESS_TOKEN`**
   - Webhook URL: 不要（push のみ使用）
4. **店舗オーナーの LINE userID 取得**:
   - 一時的に Webhook URL を https://webhook.site などで受けるか、`/v2/bot/info` を試す方法もあるが、最も簡単なのは「公式アカウントを友達追加して、何かメッセージを送ったときの Webhook payload を確認」する流れ
   - 開発初期は「自分のスマホで公式アカウント友達追加 → 何かメッセージ送る → webhook.site で受信して `events[0].source.userId` を控える」
   - **メモ → `LINE_SHOP_OWNER_USER_ID`**

> ⚠️ 友達追加されたユーザーにしか push できない。店舗オーナーは事前に公式アカウントを友達追加する必要がある。

---

## Step 3: Stripe ダッシュボード

### 3-A. アカウント作成

1. https://dashboard.stripe.com/register → メールアドレスで登録
2. 国: 日本
3. **テストモード** にしておく（右上のスイッチが「テスト」になっているか確認）
4. 本人確認・銀行口座登録は **本番運用時** までスキップして OK

### 3-B. API キー取得

1. 左メニュー「開発者」 → 「APIキー」
2. **公開可能キー** (`pk_test_xxxxx`) → **コピー → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`**
3. **シークレットキー** (`sk_test_xxxxx`) → 「キーを表示」 → **コピー → `STRIPE_SECRET_KEY`**

### 3-C. Webhook 設定（Vercel デプロイ後に実施）

> Vercel デプロイで URL が確定してから戻ってきて設定する。

1. 「開発者」 → 「Webhook」 → 「エンドポイントを追加」
2. URL: `https://<your-vercel-app>.vercel.app/api/webhook`
3. リッスンするイベント: **`checkout.session.completed`** を選択
4. 「エンドポイントを追加」をクリック
5. 表示される「**署名シークレット**」（`whsec_xxxxx`） → **コピー → `STRIPE_WEBHOOK_SECRET`**

### 3-D. ローカル Webhook テスト（任意）

1. Stripe CLI インストール: https://stripe.com/docs/stripe-cli
   - Windows: `winget install Stripe.StripeCli` または公式 zip 解凍
2. `stripe login` （ブラウザが開いて認証）
3. `stripe listen --forward-to http://localhost:3000/api/webhook`
4. 出力される `whsec_xxxxx` を **ローカルの `.env.local` だけ** に設定
5. 別ターミナルで `stripe trigger checkout.session.completed` でテスト送信

---

## Step 4: ConoHa WING + Amelia

### 4-A. ConoHa WING 契約

1. https://www.conoha.jp/wing/ → 「WINGパック」 契約
2. プラン: **ベーシック** （月¥1,210 程度）
3. 独自ドメインなしでも `<your-name>.conohawing.com` の無料ドメインが付与される
4. 「WordPressかんたんセットアップ」で WP を一発インストール

### 4-B. WordPress 初期設定

1. WP 管理画面ログイン (`https://<your-wp>/wp-admin`)
2. **テーマ**: `demo-cake` を git clone（[demo-cake README](https://github.com/Team-Rapportia/demo-cake#wp-studio-で使う) 参照）
3. 一般設定 → タイムゾーン: **東京** に設定

### 4-C. Amelia プラグインインストール

#### 無料版（Lite）の場合
1. 管理画面 → プラグイン → 新規追加
2. 「Amelia」で検索 → **「Amelia – Free Online Booking」** をインストール
3. 有効化 → 左メニューに「Amelia」が出る

#### 有料版（Pro）の場合
1. https://wpamelia.com/ で購入
2. ZIP をダウンロード → 管理画面の「プラグインをアップロード」

### 4-D. Amelia 初期設定

1. Amelia → 「Services」 → **新規サービス追加**
2. **重要**: サービスの ID を `lib/products.ts` の `id` と一致させる
   - 例: `shortcake-15` というカスタム ID を Amelia 側にも持たせる
   - 無料版は数値 ID のみなので、`lib/products.ts` の `id` を数値に変えるか、別途マッピングを持つ
3. 営業時間設定: Amelia → 「Settings」 → 「Working Hours」

### 4-E. REST API キー発行

1. Amelia → 「Settings」 → 「Integrations」 → 「API」
2. 「Generate API Key」 → **コピー → `AMELIA_API_KEY`**
3. エンドポイントベース:
   - 無料版: `https://<your-wp>/wp-json/amelia/v1`
   - Pro 版: `https://<your-wp>/wp-json/amelia/v2`
   - **メモ → `AMELIA_API_BASE`**

> ⚠️ Amelia 無料版は REST API が制限されている場合あり。**Standard プラン以上で Pro 版前提** が現実的（[strategy/04_プラン別の違い.md](https://github.com/Team-Rapportia/team-rapportia/blob/main/strategy/04_プラン別の違い.md)）。

---

## Step 5: Vercel デプロイ

### 5-A. Vercel アカウント・プロジェクト作成

1. https://vercel.com/signup → **GitHubアカウントで Sign In**
2. ダッシュボード → 「Add New」 → 「Project」
3. `Team-Rapportia/rapportia-liff` を選択して **Import**
4. Build settings: **デフォルトのまま** （Next.js を自動検出）

### 5-B. 環境変数設定

「Environment Variables」セクションに以下を **すべて** 入力（Production / Preview / Development 全部にチェック）:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_LIFF_ID` | Step 2-C で取得 |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Step 3-B の `pk_test_...` |
| `NEXT_PUBLIC_SITE_URL` | 仮で `https://example.com` （デプロイ後に確定 URL に書き換え） |
| `LINE_LOGIN_CHANNEL_ID` | Step 2-B で取得 |
| `LINE_MESSAGING_CHANNEL_ACCESS_TOKEN` | Step 2-D で取得 |
| `LINE_SHOP_OWNER_USER_ID` | Step 2-D で取得 |
| `STRIPE_SECRET_KEY` | Step 3-B の `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | 後で（Step 5-D 後）に設定 |
| `AMELIA_API_BASE` | Step 4-E |
| `AMELIA_API_KEY` | Step 4-E |
| `DEPOSIT_AMOUNT_JPY` | `2000` |

### 5-C. Deploy

「Deploy」ボタン → 数分で完了 → URL（例: `https://rapportia-liff.vercel.app`）が発行される

### 5-D. URL を各サービスに反映

1. **Vercel**: Settings → Environment Variables → `NEXT_PUBLIC_SITE_URL` を実 URL に更新 → Redeploy
2. **LINE Developers**: LIFF アプリの「エンドポイントURL」を `https://<your>.vercel.app/` に更新
3. **Stripe**: Webhook エンドポイント追加（Step 3-C）→ `whsec_...` を取得 → Vercel の `STRIPE_WEBHOOK_SECRET` に設定 → Redeploy

### 5-E. 動作確認

1. LINE で公式アカウントを友達追加（テスト用）
2. リッチメニューまたは LIFF URL (`https://liff.line.me/<LIFF_ID>`) を開く
3. ログイン → フォーム表示 → 予約 → Stripe テストカードで決済
   - テストカード番号: `4242 4242 4242 4242` / 有効期限: 未来の月年 / CVC: 任意 3 桁
4. 決済完了 → `/thanks` 表示 → LINE トークで通知が来ることを確認

---

## トラブルシューティング

| 症状 | 原因 | 対処 |
|---|---|---|
| LIFF が `LiffId not found` | Endpoint URL と実 URL が一致してない | LIFF コンソールで URL 更新 |
| `aud mismatch` で 401 | `LINE_LOGIN_CHANNEL_ID` が誤り | Channel ID を再確認（LIFF ID ではない） |
| Stripe webhook が 400 | `STRIPE_WEBHOOK_SECRET` 不一致 | 該当エンドポイントの whsec をコピーし直し |
| Amelia 502 | API キー / Base URL 誤り、または無料版で API 制限 | エンドポイントを Postman 等で叩いて切り分け |
| LINE push 失敗 | userId が友達追加されていない / トークン誤り | 公式アカウントを友達追加 |
