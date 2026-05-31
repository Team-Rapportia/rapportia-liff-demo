import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { getReservation, updateReservation } from "@/lib/store";
import { pushLineMessage } from "@/lib/line";
import { formatDate, formatTimeSlot } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 店主が管理画面からワンタップで送る「お受取リマインド」。
 * No-show（無断キャンセル）対策の実演用。
 * LINE トークン未設定 / 送信失敗時は mocked:true を返してデモを止めない。
 */
export async function POST(req: Request) {
  if (!isAdminAuthed()) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    bookingId?: unknown;
  } | null;
  const bookingId = body?.bookingId;
  if (typeof bookingId !== "string") {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const r = await getReservation(bookingId);
  if (!r) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const pickup = `${formatDate(r.pickupDate)} ${formatTimeSlot(r.pickupTimeSlot)}`;
  const msg = [
    `${r.customerName} 様`,
    "",
    "ご予約のリマインドです🎂",
    "",
    `■ ${r.productName} × ${r.quantity}個`,
    `■ お受取: ${pickup}`,
    "",
    "ご来店を心よりお待ちしております。",
  ].join("\n");

  let mocked = false;
  if (!process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN) {
    mocked = true; // ローカルデモ等、LINE 未設定
  } else {
    const result = await pushLineMessage(r.lineUserId, msg).catch(() => ({
      ok: false,
      status: 0,
    }));
    if (!result.ok) mocked = true;
  }

  await updateReservation(bookingId, { remindedAt: new Date().toISOString() });
  return NextResponse.json({ ok: true, mocked });
}
