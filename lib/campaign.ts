/**
 * 攻めPUSH（オケージョン再来店）の流入元（source / campaign）ユーティリティ。
 * 設計判断: team-rapportia/strategy/22_Pro攻めエンジンの実態（LINE再来店PUSH）.md
 *
 * - PUSH メッセージ内の LIFF リンクに `?camp=rebook_2026_06` のような印を付ける。
 * - 客がそのリンクから予約すると、予約レコードに source として残り、効果を計測できる。
 * - クライアント送信値は信用しないため、サーバー側で必ず sanitizeSource を通す。
 *
 * このファイルはサーバー専用 import を持たない純関数なので、
 * クライアント（ReservationForm）/ サーバー（checkout）双方から使える。
 */

// 許可するキャンペーン接頭辞:
//   rebook_*  … 前年同期再予約 / 再来店フォロー
//   bday_*    … 誕生日
//   anniv_*   … 記念日
//   season_*  … 季節（クリスマス・母の日等）
const SOURCE_RE = /^(rebook|bday|anniv|season)_[a-z0-9_]+$/;

/** クライアント送信の source を検証し、許可リスト外は 'organic' に丸める（サーバー側で必ず通す）。 */
export function sanitizeSource(raw?: string | null): string {
  const s = (raw ?? "").trim();
  return s.length > 0 && s.length <= 64 && SOURCE_RE.test(s) ? s : "organic";
}

/**
 * LIFF を開いた URL の query から camp を取り出す（クライアント用）。
 * LIFF は元の query をそのまま渡す場合と `liff.state` に包む場合があるため両対応。
 */
export function extractCampaign(search: string): string {
  try {
    const p = new URLSearchParams(search);
    const direct = p.get("camp");
    if (direct) return direct;

    // 例: ?liff.state=%3Fcamp%3Drebook_2026_06 / %2F%3Fcamp%3D...
    const state = p.get("liff.state");
    if (state) {
      const q = state.includes("?") ? state.slice(state.indexOf("?") + 1) : state;
      return new URLSearchParams(q).get("camp") ?? "";
    }
  } catch {
    /* 解析できなければ印なし扱い */
  }
  return "";
}

/** 前年同期再予約キャンペーンの camp ID（例: rebook_2026_06）。 */
export function rebookCampaignId(ref: Date = new Date()): string {
  const y = ref.getFullYear();
  const m = String(ref.getMonth() + 1).padStart(2, "0");
  return `rebook_${y}_${m}`;
}
