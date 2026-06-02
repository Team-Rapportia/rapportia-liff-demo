import { NextResponse } from "next/server";
import { verifyLiffIdToken } from "@/lib/line";
import {
  ADMIN_COOKIE,
  createAdminSession,
  isAllowedAdmin,
} from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * LINE ログイン（LIFF idToken）で管理者を認証する。
 * idToken を LINE で検証 → 取り出した LINE ユーザーID が許可リストにあれば
 * 署名付きセッション Cookie を発行する。複数管理者前提。
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    idToken?: unknown;
  } | null;
  const idToken = body?.idToken;

  if (typeof idToken !== "string" || idToken.length < 10) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  let userId: string;
  try {
    const payload = await verifyLiffIdToken(idToken);
    userId = payload.sub;
  } catch {
    return NextResponse.json(
      { error: "LINE 認証に失敗しました。" },
      { status: 401 }
    );
  }

  if (!isAllowedAdmin(userId)) {
    // 未登録ユーザーには本人の LINE ユーザーID を返し、管理者登録の依頼に使ってもらう。
    // （権限は付与しない＝安全。登録は既存管理者が許可リストに追加して行う）
    return NextResponse.json(
      {
        error: "この LINE アカウントには管理者権限がありません。",
        lineUserId: userId,
      },
      { status: 403 }
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, createAdminSession(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8, // 8時間
  });
  return res;
}

/** ログアウト */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
