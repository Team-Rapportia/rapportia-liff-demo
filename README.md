# rapportia-liff

LINE LIFF 予約フォーム（Next.js 14 + Vercel）。
ホールケーキ等の事前予約を LINE 経由で受け付ける、Team Rapportia パッケージの予約導線本体。

> ⚠️ **デモ用**: 商品マスタは `lib/products.ts` にハードコード。本番では Amelia REST API から取得する想定。

---

## アーキテクチャ

```
LINE 公式アカウント
   ↓ リッチメニュータップ
LIFFアプリ (Vercel)         ← このリポジトリ。 薄い UI + API 中継のみ
   ↓ POST /api/checkout（LIFF ID Token 同梱）
LINE Verify API            ← 本人確認（自社で署名検証しない）
   ↓
Amelia REST API            ← 各顧客の ConoHa WING WP 上のプラグイン
                            予約データはここに保存
   ↓
Stripe Checkout (hosted)   ← デポジット決済。カード情報は自社を通らない
   ↓ Webhook
/api/webhook
   ├→ Amelia: 予約 approved に更新
   └→ LINE Push: お客様 + 店舗オーナー
```

**Vercel 側は DB を持たない**。予約データは Amelia (顧客 WP の MySQL)、カード情報は Stripe、トーク履歴は LINE。

---

## セキュリティ設計

| 項目 | 対応 |
|---|---|
| 個人情報の自社保管 | ❌ しない。全て Amelia / Stripe / LINE に委ねる |
| 本人確認 | LIFF ID Token を LINE の verify エンドポイントで検証 |
| カード情報 | Stripe Checkout (hosted) のみ。PCI DSS SAQ-A |
| Webhook 偽造防止 | `Stripe-Signature` の HMAC 検証必須 |
| サーバーシークレット | Vercel env vars。`NEXT_PUBLIC_` プレフィックス無しはサーバー専用 |
| 入力検証 | Zod でスキーマ検証 + 商品マスタ照合 + 受取日再検証 |
| ログ | 個人情報は出力しない。booking ID と店舗 ID のみ |
| マルチテナント分離 | 1 顧客 = 1 Vercel project = 1 LINE 公式 = 1 Stripe |

---

## セットアップ

### 1. 依存インストール

```powershell
cd C:\Users\17764\team-rapportia\rapportia-liff
npm install
```

### 2. 環境変数

`.env.example` を `.env.local` にコピーして埋める。

```
NEXT_PUBLIC_LIFF_ID=                    # LINE Developers Console
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=     # Stripe ダッシュボード（pk_test_...）
NEXT_PUBLIC_SITE_URL=http://localhost:3000

LINE_LOGIN_CHANNEL_ID=                  # LIFF アプリの Channel ID (aud 検証用)
LINE_MESSAGING_CHANNEL_ACCESS_TOKEN=    # LINE Messaging API
LINE_SHOP_OWNER_USER_ID=                # 店舗オーナーの LINE userId

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

AMELIA_API_BASE=https://example.com/wp-json/amelia/v1
AMELIA_API_KEY=

DEPOSIT_AMOUNT_JPY=2000
```

### 3. ローカル起動

```powershell
npm run dev
```

http://localhost:3000 で確認。
**注**: LIFF は LINE アプリ内 / HTTPS でないと正常に動かない。ローカル開発は LIFF ID Token を環境変数で擬似的に注入するか、`ngrok` 等で HTTPS 化する。

### 4. Stripe Webhook ローカルテスト

```powershell
stripe listen --forward-to http://localhost:3000/api/webhook
```

表示される `whsec_...` を `.env.local` の `STRIPE_WEBHOOK_SECRET` に設定。

---

## Vercel デプロイ

1. Vercel ダッシュボードで新規プロジェクト → このリポジトリを import
2. 環境変数を Vercel 側で設定（上記 `.env.example` 参照）
3. デプロイ後の URL を:
   - LINE Developers Console の LIFF アプリ Endpoint URL に設定
   - Stripe Dashboard の Webhook エンドポイントに `https://<your>.vercel.app/api/webhook` を追加

---

## ディレクトリ構成

```
rapportia-liff/
├── app/
│   ├── layout.tsx              ルートレイアウト
│   ├── page.tsx                予約フォーム（LIFF Gate）
│   ├── thanks/page.tsx         決済完了ページ
│   ├── cancel/page.tsx         決済キャンセルページ
│   ├── globals.css             Tailwind
│   └── api/
│       ├── checkout/route.ts   Stripe Checkout セッション生成
│       └── webhook/route.ts    Stripe Webhook 受信
├── components/
│   ├── LiffGate.tsx            LIFF 初期化・ログインゲート
│   └── ReservationForm.tsx     予約フォーム本体
├── lib/
│   ├── env.ts                  環境変数アクセサ
│   ├── products.ts             デモ商品マスタ
│   ├── schema.ts               Zod スキーマ
│   ├── line.ts                 LINE Verify API + Messaging
│   ├── amelia.ts               Amelia REST API クライアント
│   └── stripe.ts               Stripe クライアント
├── package.json
├── tsconfig.json
├── next.config.mjs
├── tailwind.config.ts
├── postcss.config.mjs
├── .env.example
└── README.md
```

---

## カスタマイズ（顧客ごと）

業態違いの顧客（居酒屋・サロン等）に流用する場合:

- `lib/products.ts` → 該当業態の商品/サービスに差し替え
- `app/page.tsx` の見出しコピー → 業態合わせ
- `tailwind.config.ts` の `colors` → 顧客ブランドカラー
- 環境変数 → 各顧客の LIFF/Stripe/Amelia に切り替え

コードは共通 1 リポジトリ、Vercel project を顧客ごとに作成して env vars で分離する。

---

## 関連

- [team-rapportia](https://github.com/Team-Rapportia/team-rapportia) — 本部・戦略文書
- [rapportia-base-theme](https://github.com/Team-Rapportia/rapportia-base-theme) — WP 親テーマ
- [demo-cake](https://github.com/Team-Rapportia/demo-cake) — デモケーキ店サイト
