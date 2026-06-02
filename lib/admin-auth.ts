/**
 * 店主・スタッフ用管理画面の認証（複数管理者前提）。
 *
 * 旧: 合言葉(パスコード)。新: LINE ログイン + LINE ユーザーID 許可リスト。
 * 参考: 本番の Amelia は WordPress のログイン+権限で管理者を判別する。デモ/本番テンプレでは
 * 「管理者の LINE ユーザーID 許可リスト」で代替する（`ADMIN_LINE_USER_IDS`）。
 *
 * セッション Cookie には「LINE ユーザーID + サーバー秘密鍵による HMAC 署名」を入れる。
 * 署名により Cookie の偽造を防ぎ、毎リクエストで許可リスト所属も再確認する。
 */

import crypto from "crypto";
import { cookies } from "next/headers";
import { serverEnv } from "./env";

export const ADMIN_COOKIE = "rapportia_admin";

/**
 * 管理者として許可された LINE ユーザーID 一覧（複数管理者前提）。
 * `ADMIN_LINE_USER_IDS` に加え、既存の店主 ID も常に管理者扱いにする（ロックアウト防止）。
 */
export function adminUserIds(): string[] {
  const ids = new Set(serverEnv.adminLineUserIds());
  const owner = process.env.LINE_SHOP_OWNER_USER_ID?.trim();
  if (owner) ids.add(owner);
  return [...ids];
}

export function isAllowedAdmin(userId: string): boolean {
  return adminUserIds().includes(userId);
}

function sign(value: string): string {
  return crypto
    .createHmac("sha256", serverEnv.adminSessionSecret())
    .update(value)
    .digest("hex");
}

/** LINE ユーザーID を署名付きセッショントークン（Cookie 値）に変換 */
export function createAdminSession(userId: string): string {
  return `${userId}.${sign(userId)}`;
}

/** Cookie 値を検証し、正当なら LINE ユーザーIDを返す（不正なら null） */
function verifySession(token: string): string | null {
  const i = token.lastIndexOf(".");
  if (i <= 0) return null;
  const userId = token.slice(0, i);
  const sig = token.slice(i + 1);
  const expected = sign(userId);
  if (sig.length !== expected.length) return null;
  const ok = crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  return ok ? userId : null;
}

/** サーバーコンポーネント / ルートハンドラから呼ぶ認証チェック */
export function isAdminAuthed(): boolean {
  const token = cookies().get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  const userId = verifySession(token);
  return Boolean(userId && isAllowedAdmin(userId));
}
