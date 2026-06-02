import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { clearReservations } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * このデモの予約を全消去する（商談ごとのリセット用）。
 * 管理者のみ。DEMO_ID 単位なので他デモの行には影響しない。
 */
export async function DELETE() {
  if (!isAdminAuthed()) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const deleted = await clearReservations();
  return NextResponse.json({ ok: true, deleted });
}
