import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { upsertSlotOverride } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isAdminAuthed()) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (
    !body?.date ||
    !["am", "pm"].includes(body?.timeSlot) ||
    typeof body?.enabled !== "boolean"
  ) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  const override = await upsertSlotOverride(body.date, body.timeSlot, body.enabled);
  return NextResponse.json({ ok: true, override });
}
