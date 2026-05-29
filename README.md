# ⚪ rapportia-liff-demo

**Team Rapportia 商談用デモ版** LINE LIFF 予約フォーム。

> ⚠️ **このリポジトリは凍結デモです**。新機能・バグ修正は本番テンプレ [`rapportia-liff`](https://github.com/Team-Rapportia/rapportia-liff) で行います。
>
> このリポは「商談で動くものを見せる」目的のみ。Amelia (有料プラグイン) を使わず、ダミー予約 ID で Stripe 決済までの導線だけを動かします。

---

## デモと本番テンプレの違い

| 項目 | ⚪ rapportia-liff-demo（本リポ） | 🟢 rapportia-liff（本番テンプレ） |
|---|---|---|
| 予約データ保存 | ❌ なし（ダミー bookingId 発行） | ✅ Amelia Pro へ POST |
| Stripe 決済 | ✅ テストモード | ✅ 本番モード |
| LINE 通知 | ✅ お客様 + 店舗 | ✅ お客様 + 店舗 |
| WP REST API 連携 | ❌ | ✅ |
| 月額コスト | ¥0 | Amelia Pro $329/年〜 + ConoHa WING ¥1,210/月 |
| 用途 | 商談デモ | 顧客環境にデプロイ |
| 更新方針 | **凍結**（必要時のみ） | 継続進化 |

## 本番テンプレに切り替えるタイミング

- 初顧客契約が決まったら本番テンプレ `rapportia-liff` を顧客の Vercel project にデプロイ
- 顧客の Amelia Pro ライセンス購入 → 顧客の ConoHa WING に Amelia インストール
- env vars を顧客環境用に設定
- 詳細手順は [`rapportia-liff/docs/deploy-guide.md`](https://github.com/Team-Rapportia/rapportia-liff/blob/main/docs/deploy-guide.md)

---

## 構成

```
LINE 公式アカウント
   ↓ リッチメニュータップ
LIFFアプリ (Vercel) ← このリポ
   ↓ LIFF ID Token 検証 (LINE Verify API)
   ↓ ダミー bookingId 発行（Amelia の代わり）
   ↓
Stripe Checkout (hosted, テストモード)
   ↓ Webhook
LINE Messaging API
   ├→ お客様: 予約確定メッセージ
   └→ 店舗: 新規予約通知
```

## セキュリティ設計（デモ・本番共通）

| 項目 | 対応 |
|---|---|
| 個人情報の自社保管 | ❌ しない |
| 本人確認 | LIFF ID Token を LINE で検証 |
| カード情報 | Stripe Checkout (hosted)。PCI DSS SAQ-A |
| Webhook 偽造防止 | `Stripe-Signature` の HMAC 検証 |
| サーバーシークレット | Vercel env vars（`NEXT_PUBLIC_` 無しはサーバー専用） |
| 入力検証 | Zod スキーマ + 商品マスタ照合 + 受取日再検証 |
| ログ | 個人情報非出力 |

---

## ローカル起動

```powershell
cd C:\Users\17764\team-rapportia\rapportia-liff-demo
npm install
# .env.local に LINE + Stripe の値を埋める（AMELIA_* は不要）
npm run dev
```

http://localhost:3000

> LIFF は LINE 内ブラウザでないと完全動作しないので、ローカルでは「フォーム UI が描画されるか」までしか確認できない。実機テストは Vercel デプロイ後。

## 環境変数

[.env.example](./.env.example) 参照。本番テンプレと違い `AMELIA_*` が不要。

## Vercel デプロイ

1. Vercel ダッシュボードで本リポを Import
2. env vars 設定
3. Deploy → URL を LINE Developers の LIFF Endpoint URL に登録
4. Stripe Dashboard で Webhook URL を `https://<vercel-url>/api/webhook` に追加 → 取得した `whsec_...` を Vercel env に設定 → Redeploy

詳細手順は本番テンプレの [`rapportia-liff/docs/deploy-guide.md`](https://github.com/Team-Rapportia/rapportia-liff/blob/main/docs/deploy-guide.md) を参照（Amelia 関連を読み飛ばせばそのまま使えます）。

---

## 関連

- [team-rapportia](https://github.com/Team-Rapportia/team-rapportia) — 本部・戦略文書
- [rapportia-liff](https://github.com/Team-Rapportia/rapportia-liff) — 🟢 本番テンプレ
- [rapportia-base-theme](https://github.com/Team-Rapportia/rapportia-base-theme) — WP 親テーマ
- [demo-cake](https://github.com/Team-Rapportia/demo-cake) — デモケーキ店 WP テーマ
