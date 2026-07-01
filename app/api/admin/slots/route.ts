import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { getWeeklyPatterns, setWeeklyPatterns, getAllSlotOverrides } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isAdminAuthed()) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [patterns, overrides] = await Promise.all([
    getWeeklyPatterns(),
    getAllSlotOverrides(),
  ]);

  return NextResponse.json({ patterns, overrides });
}

export async function POST(req: Request) {
  if (!isAdminAuthed()) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.patterns || !Array.isArray(body.patterns)) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  await setWeeklyPatterns(body.patterns);
  return NextResponse.json({ ok: true });
}
