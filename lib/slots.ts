import { getWeeklyPatterns, getSlotOverrides, listReservations } from "./store";

export type AvailableSlot = {
  date: string; // YYYY-MM-DD (JST)
  timeSlots: ("am" | "pm")[];
};

/** サーバー(UTC)での現在日時をJSTの日付文字列に変換する */
function jstTodayStr(): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

/** YYYY-MM-DD に n 日加算した文字列を返す */
function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** YYYY-MM-DD 文字列の曜日を返す（0=日, 6=土） */
function dayOfWeek(dateStr: string): number {
  return new Date(dateStr + "T12:00:00Z").getUTCDay();
}

/**
 * JST の今日から leadDays 日後を起点に、days 日分の予約可能スロットを返す。
 * 週次パターン → 例外オーバーライド → 既存予約 の順に適用する。
 *
 * leadDays: 準備リードタイム（ケーキ注文は仕込みが要るため既定3日。相談予約は1日）。
 */
export async function getAvailableSlots(
  days = 60,
  leadDays = 1
): Promise<AvailableSlot[]> {
  const today = jstTodayStr();
  const startDate = addDays(today, leadDays);
  const endDate = addDays(today, days);

  const [patterns, overrides, reservations] = await Promise.all([
    getWeeklyPatterns(),
    getSlotOverrides(startDate, endDate),
    listReservations(),
  ]);

  const patternMap = new Map<string, boolean>();
  for (const p of patterns) {
    patternMap.set(`${p.dayOfWeek}-${p.timeSlot}`, p.enabled);
  }

  const overrideMap = new Map<string, boolean>();
  for (const o of overrides) {
    overrideMap.set(`${o.date}-${o.timeSlot}`, o.enabled);
  }

  const bookedSet = new Set<string>();
  for (const r of reservations) {
    if (r.status !== "cancelled") {
      bookedSet.add(`${r.pickupDate}-${r.pickupTimeSlot}`);
    }
  }

  const byDate = new Map<string, ("am" | "pm")[]>();
  let cur = startDate;

  while (cur <= endDate) {
    const dow = dayOfWeek(cur);
    for (const ts of ["am", "pm"] as const) {
      const key = `${cur}-${ts}`;
      const isOpen = overrideMap.has(key)
        ? overrideMap.get(key)!
        : (patternMap.get(`${dow}-${ts}`) ?? false);

      if (isOpen && !bookedSet.has(key)) {
        if (!byDate.has(cur)) byDate.set(cur, []);
        byDate.get(cur)!.push(ts);
      }
    }
    cur = addDays(cur, 1);
  }

  return Array.from(byDate.entries()).map(([date, timeSlots]) => ({ date, timeSlots }));
}
