import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";
import { ADMIN_COOKIE, adminSessionToken } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 合言葉を照合し、合致すれば管理者セッション Cookie を発行 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    passcode?: unknown;
  } | null;
  const passcode = body?.passcode;

  if (typeof passcode !== "string" || passcode !== serverEnv.adminPasscode()) {
    return NextResponse.json({ error: "合言葉が違います。" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, adminSessionToken(), {
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
