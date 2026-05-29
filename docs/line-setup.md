# LINE セットアップ手順（4 項目取得）

`rapportia-liff` の `.env.local` / Vercel env に必要な以下 4 項目を取得する手順。
2026-05 時点の LINE Developers / OA Manager UI に基づく実体験ベース。

```env
NEXT_PUBLIC_LIFF_ID=                          # ← ① LIFF アプリから
LINE_LOGIN_CHANNEL_ID=                        # ← ② LINE ログインチャネルから
LINE_MESSAGING_CHANNEL_ACCESS_TOKEN=          # ← ③ Messaging API チャネルから
LINE_SHOP_OWNER_USER_ID=                      # ← ④ webhook.site 経由で取得
```

---

## 前提：2 つのコンソールを行き来する

LINE は管理 UI が **2 つ** に分かれていて互いに連動する。混乱しないように:

| URL | 何を管理 |
|---|---|
| https://developers.line.biz/console/ | **Developers Console**: チャネル・LIFF・API トークン |
| https://manager.line.biz/ | **OA Manager**: メッセージ運用・友達管理・リッチメニュー |

基本「Developers Console 側で設定 → OA Manager に反映される」流れ。

---

## Step 0: プロバイダー作成（初回のみ）

1. https://developers.line.biz/console/ にログイン（LINE アカウント or LINE Business ID）
2. 「**プロバイダー作成**」 → 名前: `Team Rapportia`
   - 用途で分けるなら: デモは Team Rapportia、本番顧客は顧客名で別プロバイダー
3. 1 プロバイダーに複数チャネルを束ねられる

---

## ① LIFF（LINE ログインチャネル + LIFF アプリ）

### A-1. LINE ログインチャネル作成

1. プロバイダー「Team Rapportia」を開く
2. 「**新規チャネル作成**」 → **「LINE ログイン」**
3. 入力:
   - チャネル名: `ラポーティアケーキ`（OA 表示名と揃える）
   - アプリタイプ: **ウェブアプリ** ✅
   - メール: 自分のメール
4. 作成 → 上部に **Channel ID（10 桁の数字）** が表示
   - → **`LINE_LOGIN_CHANNEL_ID`** に貼り付け

### A-2. LIFF アプリ追加

1. 同チャネル内の「**LIFF**」タブ → **「追加」**
2. 設定値:

   | 項目 | 値 |
   |---|---|
   | LIFF アプリ名 | `予約フォーム` |
   | サイズ | **Full** |
   | エンドポイント URL | 仮 `https://example.com/` （Vercel デプロイ後に上書き） |
   | Scope | ✅ profile、✅ openid |
   | 友達追加オプション | **On (Aggressive)** ← push 通知を確実に届けるため |
   | Scan QR | OFF |
   | モジュールモード | OFF |

3. 作成 → **LIFF ID（例: `2010231026-BPrk21VJ`）** が発行
   - → **`NEXT_PUBLIC_LIFF_ID`** に貼り付け
4. **LIFF URL**: `https://liff.line.me/{LIFF_ID}` — 後でリッチメニュー等に使う

---

## ② / ③ Messaging API チャネル + アクセストークン

> **重要**: 2024 年以降の LINE 仕様変更で、Messaging API チャネルを作るには **先に公式アカウント（OA）を作る** 必要がある。

### B-1. 公式アカウント作成

1. https://www.linebiz.com/jp/entry/ → 「**アカウントを作成する**」
2. 「**未認証アカウント（無料）**」を選択
3. SMS 認証（個人番号で OK。エンドユーザーには非公開）
4. 入力:

   | 項目 | 値 |
   |---|---|
   | アカウント名 | `ラポーティアケーキ`（エンドユーザーに表示される） |
   | 業種（大） | 小売・販売 |
   | 業種（小） | スイーツ・ケーキ |
   | 運用目的 | 予約受付・販促 |
   | ビジネスマネージャー | **作成**（初回） |
   | 組織名 | `Team Rapportia` |
   | 会社・事業者名 | `Team Rapportia`（個人事業主・任意団体扱い OK） |

5. 完了 → LINE Official Account Manager (https://manager.line.biz/) にログインできる状態に

### B-2. Messaging API を有効化

1. https://manager.line.biz/ → 「ラポーティアケーキ」を選択
2. 右上の **歯車（設定）** → 左メニュー「**Messaging API**」
3. 「**Messaging API を利用する**」ボタンをクリック
4. プロバイダー選択: **`Team Rapportia`**（Step 0 で作ったもの）
5. 利用規約に同意 → OK

→ Messaging API チャネルが自動作成され、Developers Console 側にも反映される。

### B-3. アクセストークン発行

1. https://developers.line.biz/console/ → Team Rapportia → 新しくできた Messaging API チャネル
2. 「**Messaging API 設定**」タブ
3. ページ最下部「**チャネルアクセストークン（長期）**」 → **「発行」**
4. 表示された 172 文字程度の文字列を **コピー**
   - → **`LINE_MESSAGING_CHANNEL_ACCESS_TOKEN`** に貼り付け

---

## ④ 店舗オーナーの userId 取得

> push 通知の宛先になる userId（`U` で始まる 32 文字）を webhook.site 経由で取得する。

### C-1. webhook.site で URL 発行

1. https://webhook.site を新規タブで開く
2. ページ上部の緑色枠「**Your unique URL**」をコピー
   - 例: `https://webhook.site/abc12345-6789-defg-...`
3. **このタブは閉じない**

### C-2. LINE 側に Webhook URL を設定（順序重要）

> 「URL 設定 → 利用 ON」の順。逆だとエラーになる。

1. Developers Console → Messaging API チャネル → 「Messaging API 設定」タブ
2. 「**Webhook 設定**」セクション → 「**編集**」
3. 先ほどコピーした webhook.site の URL を貼り付け → 「**更新**」
4. 「**Webhook の利用**」を **ON**
5. 「**検証**」ボタン → "Success" 表示で OK

### C-3. 自動応答 OFF（任意だが推奨）

ボットが勝手に返事しないように:

1. 同画面の「**応答設定**」の「**編集**」 → OA Manager に飛ぶ
2. **応答メッセージ**: **OFF**
3. **あいさつメッセージ**: ON のまま OK（友達追加直後のみ）

### C-4. 自分のスマホで友達追加 → メッセージ送信

1. OA Manager → 該当アカウント → QR コードを表示
2. スマホで QR 読取 → 「ラポーティアケーキ」を友達追加
3. トーク画面で「テスト」などメッセージ送信
4. webhook.site のタブに戻る → 左側の「Requests」一覧に新着が出る
5. クリック → 右側に届いた JSON 表示

### C-5. userId をコピー

JSON 内の構造:

```json
{
  "destination": "Uxxxx...",         ← これは Bot 側の ID（使わない）
  "events": [
    {
      "type": "message",
      "source": {
        "userId": "Uxxxx..."         ← ★ こっち
      },
      ...
    }
  ]
}
```

`events[0].source.userId`（`U` + 32 文字）をコピー
→ **`LINE_SHOP_OWNER_USER_ID`** に貼り付け

> ⚠️ `destination` ではなく **`source.userId`** が正解。間違えると Bot 自身に push して 400 になる。

---

## 検証スクリプト

PowerShell で全 4 項目の形式 + 実 API を検証:

```powershell
$envFile = "C:\Users\17764\team-rapportia\rapportia-liff\.env.local"
$env_vars = @{}
Get-Content $envFile | ForEach-Object {
  if ($_ -match '^([A-Z_]+)=(.+)$') { $env_vars[$matches[1]] = $matches[2] }
}

# Bot 情報取得
$token = $env_vars['LINE_MESSAGING_CHANNEL_ACCESS_TOKEN']
$info = Invoke-RestMethod -Uri "https://api.line.me/v2/bot/info" `
  -Headers @{ Authorization = "Bearer $token" }
Write-Output "Bot 名: $($info.displayName)"

# テスト push
$body = @{
  to = $env_vars['LINE_SHOP_OWNER_USER_ID']
  messages = @(@{ type = "text"; text = "[テスト] 動作確認" })
} | ConvertTo-Json -Depth 5
Invoke-RestMethod -Uri "https://api.line.me/v2/bot/message/push" `
  -Method POST `
  -Headers @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" } `
  -Body $body
```

→ スマホにテストメッセージが届けば完了。

---

## トラブルシューティング

| 症状 | 原因 | 対処 |
|---|---|---|
| 「Webhook URL を先に設定してください」 | Webhook URL 未設定で ON にしようとした | Developers Console の Webhook URL 欄に貼ってから ON |
| webhook.site に何も届かない | Webhook の利用が OFF / URL 違い / 友達追加してない | 利用 ON、URL 再確認、QR から友達追加 |
| Push API が 400 | userId 違い（destination を使った等） | `source.userId` を再取得 |
| Push API が 403 | アクセストークン無効 | 再発行 |
| LIFF が「LiffId not found」 | LIFF Endpoint URL と実 URL が不一致 | LIFF 設定で URL 更新 |

---

## 本番移行時

実顧客に納品する際は **別プロバイダー** で作り直す:

```
プロバイダー: Team Rapportia (自社デモ用)
   └─ LIFF: 【デモ】ラポーティアケーキ予約
   └─ Messaging API: ラポーティアケーキ（テスト）

プロバイダー: 顧客名 ABC（実顧客）
   └─ LIFF: ABC 予約
   └─ Messaging API: ABC（本番）
```

理由: 漏洩・誤操作の影響範囲を顧客間で分離するため。「1 顧客 = 1 プロバイダー = 1 OA = 1 LIFF」を徹底。
