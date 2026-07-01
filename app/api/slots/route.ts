import { NextResponse } from "next/server";
import { getAvailableSlots } from "@/lib/slots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ケーキ注文は仕込みが要るため、受付は今日から3日後以降
const LEAD_DAYS = 3;

export async function GET() {
  try {
    const slots = await getAvailableSlots(60, LEAD_DAYS);
    return NextResponse.json({ slots });
  } catch (e) {
    console.error("getAvailableSlots error:", e);
    return NextResponse.json({ slots: [] });
  }
}
