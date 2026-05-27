# rapportia-liff

LINE LIFF 予約フォーム。全クライアント共通の Next.js アプリ。Vercel で配信し、URLパラメータでクライアントを識別する。

## アーキテクチャ

```
LINEリッチメニュー
   ↓
LIFFアプリ (Vercel)
   ↓ URLパラメータでクライアント識別
   ↓ POST /wp-json/amelia/v2/bookings
各クライアントのWordPress (ConoHa WING)
   ↓
Amelia (予約管理)
   ↓
Stripe Checkout (デポジット決済)
```

## 技術スタック

- Next.js（App Router）
- TypeScript
- Tailwind CSS
- Zod（スキーマ検証）
- LIFF SDK
- Stripe Checkout

## 環境変数

各クライアントの WP REST API エンドポイント・LINE Channel ID・Stripe Public Key を設定する。

## 関連

- [team-rapportia](https://github.com/Team-Rapportia/team-rapportia) - 本部・戦略文書
- [rapportia-base-theme](https://github.com/Team-Rapportia/rapportia-base-theme) - WP親テーマ
