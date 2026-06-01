import { NextResponse } from "next/server";
import { pingStorage } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * keep-alive（死活ping）。
 *
 * Supabase 無料プロジェクトは「7日間アクセスが無いと pause」される。
 * 商談デモが pause したまま固まるのを防ぐため、1日1回 DB に軽く触れて起こし続ける。
 *
 * - 静的ページを叩いても Supabase は起きない。必ず DB に触る必要があるため pingStorage() を呼ぶ。
 * - pause は Supabase プロジェクト単位。5デモを1プロジェクトに相乗りさせている場合、
 *   この ping 1本で全デモが起き続ける（叩き続ける/全ページを叩く必要はない）。
 * - cron 設定は vercel.json（Vercel Hobby は日次のみ＝7日の pause に対し十分な余裕）。
 *
 * 任意で CRON_SECRET を設定すると Authorization: Bearer <値> を要求する。
 * Vercel Cron は自動でこのヘッダを付与する。
 *
 * 設計判断: team-rapportia/strategy/13_予約バックエンドの選定（Supabase決定）.md
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await pingStorage();
    return NextResponse.json({
      ok: true,
      mode: result.mode,
      ts: new Date().toISOString(),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
