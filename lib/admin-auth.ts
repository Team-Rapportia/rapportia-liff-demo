/**
 * 店主用管理画面の「管理者判別」。
 *
 * 参考: 本番で使う Amelia は WordPress のログインセッション(Cookie)＋権限(capability)で
 * 管理者を判別する。デモには WordPress が無いので、合言葉(パスコード)で代用する。
 * （御社の本番ブランド版では「店主の LINE ユーザーID 許可リスト」にするのが理想）
 *
 * Cookie には合言葉そのものではなくハッシュを入れる（漏洩時の生パス露出を防ぐ）。
 */

import crypto from "crypto";
import { cookies } from "next/headers";
import { serverEnv } from "./env";

export const ADMIN_COOKIE = "rapportia_admin";

export function adminSessionToken(): string {
  return crypto
    .createHash("sha256")
    .update(`rapportia-admin:${serverEnv.adminPasscode()}`)
    .digest("hex");
}

/** サーバーコンポーネント / ルートハンドラから呼ぶ認証チェック */
export function isAdminAuthed(): boolean {
  const c = cookies().get(ADMIN_COOKIE)?.value;
  return Boolean(c && c === adminSessionToken());
}
