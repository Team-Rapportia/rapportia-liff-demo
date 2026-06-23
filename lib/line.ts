import { liffIdTokenPayloadSchema, type LiffIdTokenPayload } from "./schema";
import { serverEnv } from "./env";

/**
 * LIFF が発行する ID Token を LINE の verify エンドポイントで検証する。
 * これにより自社で署名検証ロジックを書かずに済む。
 * https://developers.line.biz/ja/reference/line-login/#verify-id-token
 */
export async function verifyLiffIdToken(idToken: string): Promise<LiffIdTokenPayload> {
  const body = new URLSearchParams({
    id_token: idToken,
    client_id: serverEnv.lineLoginChannelId(),
  });

  const res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    throw new Error(`LINE verify failed: ${res.status}`);
  }

  const json = await res.json();
  return liffIdTokenPayloadSchema.parse(json);
}

/**
 * LINE Messaging API で 1 ユーザーへ push 通知。
 * 失敗しても呼び出し元は致命扱いにしない（Stripe webhook を 200 で返したいため）。
 */
export async function pushLineMessage(
  toUserId: string,
  text: string
): Promise<{ ok: boolean; status: number }> {
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serverEnv.lineMessagingToken()}`,
    },
    body: JSON.stringify({
      to: toUserId,
      messages: [{ type: "text", text }],
    }),
  });

  return { ok: res.ok, status: res.status };
}

/**
 * LINE Messaging API multicast で複数ユーザーへ一括 push（攻めPUSH／オケージョン再来店）。
 * - multicast は 1 リクエスト最大 500 件なのでバッチ分割する。
 * - multicast も通常 push と同じく通数課金（原価の根拠は strategy/22 を参照）。
 * - 配信は自社運用（店主ダッシュボードからは呼ばない）。
 */
export async function pushLineMulticast(
  toUserIds: string[],
  text: string
): Promise<{ ok: boolean; sent: number }> {
  let ok = true;
  let sent = 0;

  for (let i = 0; i < toUserIds.length; i += 500) {
    const batch = toUserIds.slice(i, i + 500);
    const res = await fetch("https://api.line.me/v2/bot/message/multicast", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serverEnv.lineMessagingToken()}`,
      },
      body: JSON.stringify({
        to: batch,
        messages: [{ type: "text", text }],
      }),
    });

    if (res.ok) sent += batch.length;
    else ok = false;
  }

  return { ok, sent };
}
