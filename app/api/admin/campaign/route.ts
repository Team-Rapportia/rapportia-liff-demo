import { NextResponse } from "next/server";
import crypto from "crypto";
import {
  findAnniversaryCandidates,
  reservationStatsBySource,
} from "@/lib/store";
import { pushLineMulticast } from "@/lib/line";
import { rebookCampaignId } from "@/lib/campaign";
import { serverEnv, clientEnv } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 攻めPUSH（オケージョン再来店）の配信トリガー＝自社運用の内部エンドポイント。
 * 設計判断: team-rapportia/strategy/22_Pro攻めエンジンの実態（LINE再来店PUSH）.md
 *
 * 重要：これは「店主」ではなく「自社」が叩くもの。
 *   - Pro の原則「集客は我々が動かす・店主は予約確認のみ」に従い、店主ダッシュボードには出さない。
 *   - 認証は店主用の管理者 Cookie ではなく、自社専用の x-campaign-secret ヘッダで行う。
 *
 * POST  … 前年同期再予約PUSHを配信
 *   body: { windowDays?: number, message?: string, dryRun?: boolean }
 *   - dryRun=true なら対象人数だけ返し、送信はしない（店主への文面承認・規模確認に使う）。
 * GET   … 流入元(source)別の件数・売上レポート（効果証明）
 *   query: ?since=YYYY-MM-DD（任意）
 */

function authed(req: Request): boolean {
  const secret = serverEnv.campaignTriggerSecret();
  if (!secret) return false; // 未設定なら常に拒否（安全側）
  const provided = req.headers.get("x-campaign-secret") ?? "";
  if (provided.length !== secret.length) return false;
  return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(secret));
}

/** 前年同期再予約の既定文面。?camp 付きの LIFF リンクで流入元を計測できるようにする。 */
function buildRebookMessage(camp: string, override?: string): string {
  const liffId = clientEnv.liffId;
  const link = liffId
    ? `https://liff.line.me/${liffId}?camp=${camp}`
    : `${clientEnv.siteUrl}?camp=${camp}`;

  if (override && override.trim()) {
    // 自社/店主が用意・承認した文面。{link} があれば差し込む。
    return override.includes("{link}")
      ? override.replaceAll("{link}", link)
      : `${override}\n\n▼ ご予約はこちら\n${link}`;
  }

  return [
    "去年の今ごろ、当店のホールケーキをご予約いただきました🎂",
    "",
    "今年も、大切な日のケーキを承ります。",
    "ご予約はお早めにどうぞ。",
    "",
    "▼ ご予約はこちら",
    link,
  ].join("\n");
}

export async function POST(req: Request) {
  if (!authed(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    windowDays?: number;
    message?: string;
    dryRun?: boolean;
  };

  const camp = rebookCampaignId();
  const targets = await findAnniversaryCandidates({
    windowDays:
      typeof body.windowDays === "number" ? body.windowDays : undefined,
  });

  // dryRun: 送信せず対象規模だけ返す（文面承認・通数（=原価）見積もり用）。
  if (body.dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      camp,
      targetCount: targets.length,
    });
  }

  if (targets.length === 0) {
    return NextResponse.json({ ok: true, camp, targetCount: 0, sent: 0 });
  }

  const text = buildRebookMessage(camp, body.message);
  const result = await pushLineMulticast(targets, text);

  return NextResponse.json({
    ok: result.ok,
    camp,
    targetCount: targets.length,
    sent: result.sent,
  });
}

export async function GET(req: Request) {
  if (!authed(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const since = new URL(req.url).searchParams.get("since") ?? undefined;
  const stats = await reservationStatsBySource(
    since ? { since } : undefined
  );

  return NextResponse.json({ ok: true, since: since ?? null, stats });
}
