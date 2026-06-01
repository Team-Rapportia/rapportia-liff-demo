/**
 * ⚪ デモ版: Amelia は使用しない（有料 + WP 環境が必要なため）。
 * 本番テンプレ (rapportia-liff) では実際の Amelia REST API を叩く。
 *
 * このデモでは Amelia の代役として自前ストア (lib/store: Supabase / メモリ) に
 * 予約を保存する。これにより「LINE で予約 → 店主のスマホ管理画面に反映」を
 * 商談で実演できる。
 *   createPendingBooking … 仮予約(pending)を保存   ← 本番は Amelia へ pending POST
 *   confirmBooking       … 決済完了で確定(confirmed) ← 本番は Amelia を approved に更新
 */

import { serverEnv } from "./env";
import { saveReservation, updateReservation } from "./store";

export type AmeliaBookingInput = {
  serviceId: string;
  productName: string;
  productPriceJpy: number;
  quantity: number;
  pickupDate: string;
  pickupTimeSlot: "am" | "pm";
  customerName: string;
  customerLineUserId: string;
  customerNote?: string;
};

export type AmeliaBookingResult = {
  bookingId: string;
  status: "pending" | "confirmed";
};

export async function createPendingBooking(
  input: AmeliaBookingInput
): Promise<AmeliaBookingResult> {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 8);
  const bookingId = `demo_${input.serviceId}_${ts}_${rnd}`;

  await saveReservation({
    bookingId,
    lineUserId: input.customerLineUserId,
    customerName: input.customerName,
    productId: input.serviceId,
    productName: input.productName,
    productPriceJpy: input.productPriceJpy,
    quantity: input.quantity,
    pickupDate: input.pickupDate,
    pickupTimeSlot: input.pickupTimeSlot,
    customerNote: input.customerNote ?? "",
    depositJpy: serverEnv.depositAmountJpy(),
    status: "pending",
    createdAt: new Date().toISOString(),
  });

  return { bookingId, status: "pending" };
}

export async function confirmBooking(bookingId: string): Promise<void> {
  await updateReservation(bookingId, {
    status: "confirmed",
    confirmedAt: new Date().toISOString(),
  });
}
