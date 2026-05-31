/**
 * ⚪ デモ用 予約ストア。
 *
 * 本番テンプレ (rapportia-liff) では予約データは Amelia(WordPress MySQL) が保持する。
 * デモでは Amelia を使わない（有料なので）ため、その代役として:
 *   - Upstash / Vercel KV（環境変数があれば）に永続化
 *   - 無ければプロセス内メモリ（ローカル開発はこれだけで動く）
 *
 * 「スマホで予約 → 店主の管理画面(別デバイス)に即反映」を見せるには、
 * リクエストをまたいで共有できる保存先が要る。KV がその役割。
 */

export type ReservationStatus = "pending" | "confirmed" | "cancelled";

export type Reservation = {
  bookingId: string;
  lineUserId: string;
  customerName: string;
  productId: string;
  productName: string;
  productPriceJpy: number;
  quantity: number;
  pickupDate: string; // YYYY-MM-DD
  pickupTimeSlot: "am" | "pm";
  customerNote: string;
  depositJpy: number;
  status: ReservationStatus;
  createdAt: string; // ISO8601
  confirmedAt?: string;
  remindedAt?: string;
};

const HASH = "reservations";

// --- KV (Upstash REST) があれば使う ---

function kvConfigured(): boolean {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

async function kv(command: (string | number)[]): Promise<unknown> {
  const res = await fetch(process.env.KV_REST_API_URL as string, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`KV ${command[0]} failed: ${res.status}`);
  }
  const json = (await res.json()) as { result?: unknown };
  return json.result;
}

// --- メモリ fallback（dev の HMR でも保持されるよう globalThis に逃がす） ---

const memory: Map<string, Reservation> =
  (globalThis as { __rapportiaReservations?: Map<string, Reservation> })
    .__rapportiaReservations ??
  ((globalThis as { __rapportiaReservations?: Map<string, Reservation> })
    .__rapportiaReservations = new Map<string, Reservation>());

// --- public API ---

export async function saveReservation(r: Reservation): Promise<void> {
  if (kvConfigured()) {
    await kv(["HSET", HASH, r.bookingId, JSON.stringify(r)]);
  } else {
    memory.set(r.bookingId, r);
  }
}

export async function getReservation(
  bookingId: string
): Promise<Reservation | null> {
  if (kvConfigured()) {
    const v = await kv(["HGET", HASH, bookingId]);
    return typeof v === "string" ? (JSON.parse(v) as Reservation) : null;
  }
  return memory.get(bookingId) ?? null;
}

export async function listReservations(): Promise<Reservation[]> {
  let all: Reservation[];
  if (kvConfigured()) {
    // HGETALL は [field1, value1, field2, value2, ...] のフラット配列で返る
    const flat = (await kv(["HGETALL", HASH])) as string[] | null;
    all = [];
    if (Array.isArray(flat)) {
      for (let i = 1; i < flat.length; i += 2) {
        try {
          all.push(JSON.parse(flat[i]) as Reservation);
        } catch {
          /* 壊れた値はスキップ */
        }
      }
    }
  } else {
    all = Array.from(memory.values());
  }
  // 新しい順
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function updateReservation(
  bookingId: string,
  patch: Partial<Reservation>
): Promise<Reservation | null> {
  const current = await getReservation(bookingId);
  if (!current) return null;
  const next = { ...current, ...patch };
  await saveReservation(next);
  return next;
}

/** デモが KV を使っているか（管理画面の表示用） */
export function storageMode(): "kv" | "memory" {
  return kvConfigured() ? "kv" : "memory";
}
