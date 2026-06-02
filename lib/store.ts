/**
 * ⚪ デモ用 予約ストア（Supabase / メモリ）。
 *
 * 本番テンプレ (rapportia-liff) では予約データは Amelia(WordPress MySQL) が保持する。
 * デモでは Amelia を使わない（有料なので）ため、その代役として:
 *   - Supabase(Postgres)（SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY があれば）に永続化
 *   - 無ければプロセス内メモリ（ローカル開発はこれだけで動く）
 *
 * 「スマホで予約 → 店主の管理画面(別デバイス)に即反映」を見せるには、
 * リクエストをまたいで共有できる保存先が要る。Supabase がその役割。
 *
 * 複数デモ（業態別）を 1 Supabase プロジェクトに相乗りさせるため、行は demo_id で分離する
 * （無料枠の 2プロジェクト/組織 制限への対応 + RLS 前提）。DEMO_ID 環境変数で切り替え。
 *
 * 設計判断: team-rapportia/strategy/13_予約バックエンドの選定（Supabase決定）.md
 * lib/amelia.ts の共通インターフェース（saveReservation 等）は維持する（将来 Amelia へ復帰可能）。
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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

const TABLE = "reservations";

/** このデモインスタンスのテナント識別子（1プロジェクト相乗り時の分離キー） */
const DEMO_ID = process.env.DEMO_ID ?? "cake";

// --- Supabase（サーバー専用 service_role キーで接続。RLS をバイパスする信頼済み経路） ---

function supabaseConfigured(): boolean {
  return Boolean(
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

let _client: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      process.env.SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
  }
  return _client;
}

// --- DB(snake_case) <-> TS(camelCase) マッピング ---

type Row = {
  booking_id: string;
  demo_id: string;
  line_user_id: string;
  customer_name: string;
  product_id: string;
  product_name: string;
  product_price_jpy: number;
  quantity: number;
  pickup_date: string;
  pickup_time_slot: "am" | "pm";
  customer_note: string;
  deposit_jpy: number;
  status: ReservationStatus;
  created_at: string;
  confirmed_at: string | null;
  reminded_at: string | null;
};

function rowToReservation(r: Row): Reservation {
  return {
    bookingId: r.booking_id,
    lineUserId: r.line_user_id,
    customerName: r.customer_name,
    productId: r.product_id,
    productName: r.product_name,
    productPriceJpy: r.product_price_jpy,
    quantity: r.quantity,
    pickupDate: r.pickup_date,
    pickupTimeSlot: r.pickup_time_slot,
    customerNote: r.customer_note,
    depositJpy: r.deposit_jpy,
    status: r.status,
    createdAt: r.created_at,
    confirmedAt: r.confirmed_at ?? undefined,
    remindedAt: r.reminded_at ?? undefined,
  };
}

function reservationToRow(r: Reservation): Row {
  return {
    booking_id: r.bookingId,
    demo_id: DEMO_ID,
    line_user_id: r.lineUserId,
    customer_name: r.customerName,
    product_id: r.productId,
    product_name: r.productName,
    product_price_jpy: r.productPriceJpy,
    quantity: r.quantity,
    pickup_date: r.pickupDate,
    pickup_time_slot: r.pickupTimeSlot,
    customer_note: r.customerNote,
    deposit_jpy: r.depositJpy,
    status: r.status,
    created_at: r.createdAt,
    confirmed_at: r.confirmedAt ?? null,
    reminded_at: r.remindedAt ?? null,
  };
}

// --- メモリ fallback（dev の HMR でも保持されるよう globalThis に逃がす） ---

const memory: Map<string, Reservation> =
  (globalThis as { __rapportiaReservations?: Map<string, Reservation> })
    .__rapportiaReservations ??
  ((globalThis as { __rapportiaReservations?: Map<string, Reservation> })
    .__rapportiaReservations = new Map<string, Reservation>());

// --- public API（KV 版から差し替え。シグネチャは不変） ---

export async function saveReservation(r: Reservation): Promise<void> {
  if (supabaseConfigured()) {
    const { error } = await sb()
      .from(TABLE)
      .upsert(reservationToRow(r), { onConflict: "booking_id" });
    if (error) throw new Error(`Supabase upsert failed: ${error.message}`);
  } else {
    memory.set(r.bookingId, r);
  }
}

export async function getReservation(
  bookingId: string
): Promise<Reservation | null> {
  if (supabaseConfigured()) {
    const { data, error } = await sb()
      .from(TABLE)
      .select("*")
      .eq("demo_id", DEMO_ID)
      .eq("booking_id", bookingId)
      .maybeSingle();
    if (error) throw new Error(`Supabase select failed: ${error.message}`);
    return data ? rowToReservation(data as Row) : null;
  }
  return memory.get(bookingId) ?? null;
}

export async function listReservations(): Promise<Reservation[]> {
  if (supabaseConfigured()) {
    const { data, error } = await sb()
      .from(TABLE)
      .select("*")
      .eq("demo_id", DEMO_ID)
      .order("created_at", { ascending: false });
    if (error) throw new Error(`Supabase list failed: ${error.message}`);
    return ((data as Row[] | null) ?? []).map(rowToReservation);
  }
  // 新しい順
  return Array.from(memory.values()).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
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

/**
 * このデモ（DEMO_ID）の予約をすべて削除する。
 * 商談ごとに管理画面から実演データをリセットする用途（他デモの行には触れない）。
 * @returns 削除した件数
 */
export async function clearReservations(): Promise<number> {
  if (supabaseConfigured()) {
    const { data, error } = await sb()
      .from(TABLE)
      .delete()
      .eq("demo_id", DEMO_ID)
      .select("booking_id");
    if (error) throw new Error(`Supabase delete failed: ${error.message}`);
    return (data as { booking_id: string }[] | null)?.length ?? 0;
  }
  const n = memory.size;
  memory.clear();
  return n;
}

/**
 * 死活確認（keep-alive 用）。Supabase に軽いクエリを 1 回投げて起こし続ける。
 * 無料プロジェクトの「7日無アクセスで pause」を防ぐ。DB に実際に触れる必要がある。
 */
export async function pingStorage(): Promise<{
  ok: boolean;
  mode: "supabase" | "memory";
}> {
  if (supabaseConfigured()) {
    const { error } = await sb()
      .from(TABLE)
      .select("booking_id")
      .eq("demo_id", DEMO_ID)
      .limit(1);
    if (error) throw new Error(`Supabase ping failed: ${error.message}`);
    return { ok: true, mode: "supabase" };
  }
  return { ok: true, mode: "memory" };
}

/** デモが Supabase を使っているか（管理画面の表示用） */
export function storageMode(): "supabase" | "memory" {
  return supabaseConfigured() ? "supabase" : "memory";
}
