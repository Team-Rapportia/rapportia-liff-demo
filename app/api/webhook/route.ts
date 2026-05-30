import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { confirmBooking } from "@/lib/amelia";
import { pushLineMessage } from "@/lib/line";
import { serverEnv } from "@/lib/env";
import { findProduct } from "@/lib/products";
import { formatDate, formatTimeSlot, formatJpy } from "@/lib/format";
import type Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ⚪ デモ版 Stripe Webhook: payment 完了で LINE 通知を push する。
 * 本番テンプレでは Amelia の予約を approved に変更する処理も入る。
 *
 * セキュリティ：
 * - Stripe-Signature を必ず HMAC 検証（偽造 webhook を拒否）
 * - 個人情報は payload に最小限のみ
 * - 一時的なエラーは 5xx を返してリトライさせ、恒久的な失敗は記録だけして 200 で受け流す
 */

type ReservationData = {
  bookingId: string;
  lineUserId: string;
  productName: string;
  productPriceJpy: number;
  quantity: number;
  pickupDate: string;
  pickupTimeSlot: "am" | "pm";
  customerName: string;
  customerNote: string;
};

function extractReservation(session: Stripe.Checkout.Session): ReservationData | null {
  const m = session.metadata ?? {};
  if (!m.bookingId || !m.lineUserId) return null;

  const productPriceJpy = Number(m.productPriceJpy ?? 0);
  const quantity = Number(m.quantity ?? 1);
  if (Number.isNaN(productPriceJpy) || Number.isNaN(quantity)) return null;

  return {
    bookingId: m.bookingId,
    lineUserId: m.lineUserId,
    productName: m.productName ?? "ご注文商品",
    productPriceJpy,
    quantity,
    pickupDate: m.pickupDate ?? "",
    pickupTimeSlot: (m.pickupTimeSlot as "am" | "pm") ?? "am",
    customerName: m.customerName ?? "",
    customerNote: m.customerNote ?? "",
  };
}

function buildCustomerMessage(r: ReservationData, depositJpy: number): string {
  const subtotal = r.productPriceJpy * r.quantity;
  const remaining = Math.max(0, subtotal - depositJpy);
  const pickup = `${formatDate(r.pickupDate)} ${formatTimeSlot(r.pickupTimeSlot)}`;

  const lines = [
    "ご予約を確定いたしました🎂",
    "",
    "━━━━━━━━━━━",
    "■ ご注文内容",
    "━━━━━━━━━━━",
    `${r.productName}`,
    `数量: ${r.quantity}個`,
    `小計: ${formatJpy(subtotal)}`,
    "",
    "■ お受取",
    pickup,
    "",
    "■ お名前",
    `${r.customerName} 様`,
  ];

  if (r.customerNote) {
    lines.push("", "■ ご要望", r.customerNote);
  }

  lines.push(
    "",
    "━━━━━━━━━━━",
    "■ お支払い",
    "━━━━━━━━━━━",
    `予約金（決済完了）: ${formatJpy(depositJpy)}`,
    `店頭でのお支払い: ${formatJpy(remaining)}`,
    "",
    `予約番号: ${r.bookingId}`,
    "",
    "ご来店をお待ちしております。"
  );

  return lines.join("\n");
}

function buildShopMessage(r: ReservationData, depositJpy: number): string {
  const subtotal = r.productPriceJpy * r.quantity;
  const remaining = Math.max(0, subtotal - depositJpy);
  const pickup = `${formatDate(r.pickupDate)} ${formatTimeSlot(r.pickupTimeSlot)}`;

  const lines = [
    "[新規予約📅]",
    `お客様: ${r.customerName} 様`,
    "",
    "■ 商品",
    `${r.productName} × ${r.quantity}個`,
    `小計 ${formatJpy(subtotal)}`,
    "",
    "■ お受取",
    pickup,
  ];

  if (r.customerNote) {
    lines.push("", "■ ご要望", r.customerNote);
  }

  lines.push(
    "",
    "■ お支払い",
    `予約金 ${formatJpy(depositJpy)}（決済完了）`,
    `残額 ${formatJpy(remaining)}（店頭）`,
    "",
    `予約番号: ${r.bookingId}`
  );

  return lines.join("\n");
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      rawBody,
      sig,
      serverEnv.stripeWebhookSecret()
    );
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const reservation = extractReservation(session);

  if (!reservation) {
    return NextResponse.json({ received: true, skipped: true });
  }

  // フォールバック: metadata.productName が無くても products マスタから補完
  if (!session.metadata?.productName) {
    const productId = session.metadata?.productId ?? "";
    const product = findProduct(productId);
    if (product) {
      reservation.productName = product.name;
      reservation.productPriceJpy = product.priceJpy;
    }
  }

  try {
    await confirmBooking(reservation.bookingId);
  } catch {
    return NextResponse.json({ error: "retry" }, { status: 503 });
  }

  const depositJpy = serverEnv.depositAmountJpy();
  const customerMsg = buildCustomerMessage(reservation, depositJpy);
  const shopMsg = buildShopMessage(reservation, depositJpy);

  // LINE 通知は best-effort（失敗してもリトライ不要、予約自体は確定済み）
  await pushLineMessage(reservation.lineUserId, customerMsg).catch(() => {});
  await pushLineMessage(serverEnv.lineShopOwnerUserId(), shopMsg).catch(() => {});

  return NextResponse.json({ received: true });
}
