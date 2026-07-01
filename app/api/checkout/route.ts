import { NextResponse } from "next/server";
import { checkoutRequestSchema } from "@/lib/schema";
import { verifyLiffIdToken } from "@/lib/line";
import { createPendingBooking } from "@/lib/amelia";
import { getStripe } from "@/lib/stripe";
import { findProduct } from "@/lib/products";
import { sanitizeSource } from "@/lib/campaign";
import { serverEnv } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const raw = await req.json().catch(() => null);
  const parsed = checkoutRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "入力内容に誤りがあります。" },
      { status: 400 }
    );
  }

  const input = parsed.data;

  // 流入元（攻めPUSHの効果証明）。クライアント送信値は信用せず許可リストで丸める。
  const source = sanitizeSource(input.source);

  // 1. LIFF ID Token を LINE 側で検証（本人確認）
  let lineUserId: string;
  try {
    const payload = await verifyLiffIdToken(input.liffIdToken);
    if (payload.aud !== serverEnv.lineLoginChannelId()) {
      return NextResponse.json({ error: "認証エラー" }, { status: 401 });
    }
    lineUserId = payload.sub;
  } catch {
    return NextResponse.json(
      { error: "LINE 認証に失敗しました。" },
      { status: 401 }
    );
  }

  // 2. 商品マスタ照合（クライアント送信値を信用しない）
  const product = findProduct(input.productId);
  if (!product) {
    return NextResponse.json(
      { error: "ご指定の商品が見つかりません。" },
      { status: 400 }
    );
  }

  // 3. 受取日：3 日以上先かつ過去でないことを再検証
  const pickup = new Date(`${input.pickupDate}T00:00:00`);
  const threeDaysLater = new Date();
  threeDaysLater.setHours(0, 0, 0, 0);
  threeDaysLater.setDate(threeDaysLater.getDate() + 3);
  if (Number.isNaN(pickup.getTime()) || pickup < threeDaysLater) {
    return NextResponse.json(
      { error: "お受取日はご予約日の3日以上先をご指定ください。" },
      { status: 400 }
    );
  }

  // 4. 仮予約 ID 発行（デモではダミー / 本番テンプレでは Amelia へ pending POST）
  let bookingId: string;
  try {
    const result = await createPendingBooking({
      serviceId: product.id,
      productName: product.name,
      productPriceJpy: product.priceJpy,
      quantity: input.quantity,
      pickupDate: input.pickupDate,
      pickupTimeSlot: input.pickupTimeSlot,
      customerName: input.customerName,
      customerLineUserId: lineUserId,
      customerNote: input.customerNote,
      source,
    });
    bookingId = result.bookingId;
  } catch (e) {
    if (e instanceof Error && e.message === "SLOT_CONFLICT") {
      return NextResponse.json(
        { error: "この日時はすでに予約が入っています。別の日時をお選びください。" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "ご予約の受付に失敗しました。時間を置いて再度お試しください。" },
      { status: 502 }
    );
  }

  // 5. Stripe Checkout セッション生成（hosted page）
  let checkoutUrl: string;
  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      // 即時決済のみ採用（コンビニ/銀行振込=非同期、WeChat/Alipay=ニッチ は除外）。
      // Apple Pay / Google Pay は "card" 有効時に対応端末で自動表示されるため列挙不要。
      // ※ PayPay は Stripe の対応決済手段に含まれないため不可（別PSP/PayPay APIが必要）。
      payment_method_types: ["card", "link", "amazon_pay"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "jpy",
            unit_amount: serverEnv.depositAmountJpy(),
            product_data: {
              name: `予約金 / ${product.name} × ${input.quantity}個`,
              description: `お受取日: ${input.pickupDate} / ${input.pickupTimeSlot === "am" ? "午前" : "午後"}`,
            },
          },
        },
      ],
      // metadata に注文詳細を載せる（webhook で予約完了通知を構築するため）
      // 個人情報は最小限・店舗オーナーへの通知に必要な値のみ
      metadata: {
        bookingId,
        lineUserId,
        productId: product.id,
        productName: product.name,
        productPriceJpy: String(product.priceJpy),
        quantity: String(input.quantity),
        pickupDate: input.pickupDate,
        pickupTimeSlot: input.pickupTimeSlot,
        customerName: input.customerName,
        customerNote: input.customerNote ?? "",
        source,
      },
      success_url: `${serverEnv.siteUrl()}/thanks?bid=${encodeURIComponent(bookingId)}`,
      cancel_url: `${serverEnv.siteUrl()}/cancel?bid=${encodeURIComponent(bookingId)}`,
    });

    if (!session.url) {
      throw new Error("Stripe session URL missing");
    }
    checkoutUrl = session.url;
  } catch {
    return NextResponse.json(
      { error: "決済の準備に失敗しました。" },
      { status: 502 }
    );
  }

  return NextResponse.json({ checkoutUrl });
}
