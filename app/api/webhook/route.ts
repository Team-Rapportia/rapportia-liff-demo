import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { confirmBooking } from "@/lib/amelia";
import { pushLineMessage } from "@/lib/line";
import { serverEnv } from "@/lib/env";
import { findProduct } from "@/lib/products";
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
 * - 失敗しても 200 を返す場合があるか慎重に：Stripe は 2xx 以外でリトライするので、
 *   一時的なエラーは 5xx を返してリトライさせ、恒久的な失敗は記録だけして 200 で受け流す
 */
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
  const bookingId = session.metadata?.bookingId;
  const lineUserId = session.metadata?.lineUserId;
  const productId = session.metadata?.productId;

  if (!bookingId || !lineUserId || !productId) {
    // metadata 欠落は恒久エラー扱い、リトライ不要
    return NextResponse.json({ received: true, skipped: true });
  }

  try {
    await confirmBooking(bookingId);
  } catch {
    return NextResponse.json({ error: "retry" }, { status: 503 });
  }

  // LINE 通知は best-effort。失敗してもリトライ不要（予約自体は確定済み）
  const product = findProduct(productId);
  const productName = product?.name ?? "ご注文商品";
  const depositText = `¥${serverEnv.depositAmountJpy().toLocaleString()}`;

  await pushLineMessage(
    lineUserId,
    `ご予約を確定いたしました。\n\n商品: ${productName}\n予約金: ${depositText}（決済完了）\n予約番号: ${bookingId}\n\nお受取日に店頭でお待ちしております。`
  ).catch(() => {});

  await pushLineMessage(
    serverEnv.lineShopOwnerUserId(),
    `[新規予約] ${productName} / 予約番号 ${bookingId} / 予約金 ${depositText} 受領済み`
  ).catch(() => {});

  return NextResponse.json({ received: true });
}
