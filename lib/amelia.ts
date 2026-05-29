/**
 * ⚪ デモ版: Amelia は使用しない。
 * 本番テンプレ (rapportia-liff) では実際の Amelia REST API を叩く。
 *
 * このデモではダミーの bookingId を即時返すだけ。Stripe Checkout と
 * LINE 通知のフローだけを商談で見せるための疑似実装。
 */

export type AmeliaBookingInput = {
  serviceId: string;
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
  return {
    bookingId: `demo_${input.serviceId}_${ts}_${rnd}`,
    status: "pending",
  };
}

export async function confirmBooking(_bookingId: string): Promise<void> {
  return;
}
