/**
 * 通知メッセージ用のフォーマッタ。
 * 日付や時間帯を日本語で読みやすく整形する。
 */

const DOW = ["日", "月", "火", "水", "木", "金", "土"];

export function formatDate(yyyymmdd: string): string {
  if (!yyyymmdd || !/^\d{4}-\d{2}-\d{2}$/.test(yyyymmdd)) return yyyymmdd;
  const d = new Date(`${yyyymmdd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return yyyymmdd;
  return `${yyyymmdd.replace(/-/g, "/")}（${DOW[d.getDay()]}）`;
}

export function formatTimeSlot(slot: "am" | "pm"): string {
  return slot === "am" ? "午前 10:00 - 12:00" : "午後 15:00 - 18:00";
}

export function formatJpy(n: number): string {
  return `¥${n.toLocaleString("ja-JP")}`;
}
