import { serverEnv } from "./env";

/**
 * Amelia REST API の薄いラッパー。
 * 本番では顧客の WordPress 上の /wp-json/amelia/v1/* に対して認証付きで POST する。
 *
 * セキュリティ注意：
 * - APIキーはサーバー専用 env。クライアントへ漏らさない
 * - Amelia 側で予約データを保管するため、Vercel 側では永続化しない
 */

export type AmeliaBookingInput = {
  serviceId: string;
  pickupDate: string; // YYYY-MM-DD
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
  const res = await fetch(`${serverEnv.ameliaApiBase()}/bookings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Amelia-Api-Key": serverEnv.ameliaApiKey(),
    },
    body: JSON.stringify({
      serviceId: input.serviceId,
      bookingStart: `${input.pickupDate}T${input.pickupTimeSlot === "am" ? "10:00" : "15:00"}:00`,
      status: "pending",
      customFields: {
        lineUserId: input.customerLineUserId,
        customerName: input.customerName,
        note: input.customerNote ?? "",
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Amelia booking failed: ${res.status}`);
  }

  const json = (await res.json()) as { bookingId?: string; id?: string };
  const bookingId = json.bookingId ?? json.id;
  if (!bookingId) {
    throw new Error("Amelia booking response missing id");
  }

  return { bookingId: String(bookingId), status: "pending" };
}

export async function confirmBooking(bookingId: string): Promise<void> {
  const res = await fetch(
    `${serverEnv.ameliaApiBase()}/bookings/${encodeURIComponent(bookingId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-Amelia-Api-Key": serverEnv.ameliaApiKey(),
      },
      body: JSON.stringify({ status: "approved" }),
    }
  );

  if (!res.ok) {
    throw new Error(`Amelia confirm failed: ${res.status}`);
  }
}
