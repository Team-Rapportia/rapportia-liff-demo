"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Reservation, ReservationStatus } from "@/lib/store";
import { formatDate, formatTimeSlot, formatJpy } from "@/lib/format";

type Props = {
  reservations: Reservation[];
  storage: "supabase" | "memory";
};

type Filter = "all" | ReservationStatus;

const STATUS_META: Record<
  ReservationStatus,
  { label: string; cls: string }
> = {
  pending: { label: "仮予約・未決済", cls: "bg-amber-100 text-amber-800" },
  confirmed: { label: "確定", cls: "bg-emerald-100 text-emerald-800" },
  cancelled: { label: "キャンセル", cls: "bg-gray-200 text-gray-600" },
};

function formatCreatedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const mm = d.getMonth() + 1;
  const dd = d.getDate();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${mm}/${dd} ${hh}:${mi}`;
}

export function AdminReservationList({ reservations, storage }: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [clearing, setClearing] = useState(false);

  const counts = {
    all: reservations.length,
    pending: reservations.filter((r) => r.status === "pending").length,
    confirmed: reservations.filter((r) => r.status === "confirmed").length,
    cancelled: reservations.filter((r) => r.status === "cancelled").length,
  };

  const shown =
    filter === "all"
      ? reservations
      : reservations.filter((r) => r.status === filter);

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" }).catch(() => {});
    window.location.href = "/admin/login";
  }

  async function clearAll() {
    if (
      !window.confirm(
        `このデモの予約 ${counts.all} 件をすべて削除します。\n商談前のリセット用です。元に戻せません。よろしいですか？`
      )
    ) {
      return;
    }
    setClearing(true);
    try {
      const res = await fetch("/api/admin/reservations", { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setClearing(false);
    }
  }

  const tabs: { key: Filter; label: string }[] = [
    { key: "all", label: `すべて (${counts.all})` },
    { key: "pending", label: `仮予約 (${counts.pending})` },
    { key: "confirmed", label: `確定 (${counts.confirmed})` },
    { key: "cancelled", label: `取消 (${counts.cancelled})` },
  ];

  return (
    <main className="max-w-md mx-auto px-4 py-5 min-h-screen bg-bg">
      <header className="flex items-center justify-between mb-1">
        <div>
          <p className="font-heading text-primary-dark text-base leading-none">
            Reservations
          </p>
          <h1 className="text-lg font-bold mt-1">予約管理</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.refresh()}
            className="text-xs border border-gray-300 rounded-full px-3 py-1.5 bg-white active:bg-gray-100"
          >
            更新
          </button>
          <button
            onClick={logout}
            className="text-xs text-gray-500 px-2 py-1.5"
          >
            ログアウト
          </button>
        </div>
      </header>

      <div className="flex items-center justify-between gap-2 mb-4">
        <p className="text-[11px] text-gray-400">
          保存先: {storage === "supabase" ? "Supabase（共有・別デバイスでも反映）" : "メモリ（このサーバー内のみ・開発用）"}
        </p>
        <button
          onClick={clearAll}
          disabled={clearing || counts.all === 0}
          className="whitespace-nowrap text-[11px] text-accent border border-accent/40 rounded-full px-3 py-1 active:bg-red-50 disabled:opacity-30"
        >
          {clearing ? "消去中..." : "予約を全消去"}
        </button>
      </div>

      {/* フィルタタブ */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`whitespace-nowrap text-xs rounded-full px-3 py-1.5 border transition ${
              filter === t.key
                ? "bg-primary-dark text-white border-primary-dark"
                : "bg-white text-gray-600 border-gray-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="text-center text-gray-400 py-20 text-sm">
          <p className="text-3xl mb-3">🎂</p>
          {counts.all === 0 ? (
            <>
              <p>まだ予約はありません。</p>
              <p className="mt-1">
                LINE 予約フォームから予約すると
                <br />
                ここに表示されます。
              </p>
            </>
          ) : (
            <p>該当する予約はありません。</p>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {shown.map((r) => (
            <ReservationCard key={r.bookingId} r={r} />
          ))}
        </ul>
      )}

      <p className="text-center text-xs text-gray-400 mt-10 pb-6">
        Team Rapportia デモ予約管理
      </p>
    </main>
  );
}

function ReservationCard({ r }: { r: Reservation }) {
  const [sending, setSending] = useState(false);
  const [reminded, setReminded] = useState(Boolean(r.remindedAt));
  const [mocked, setMocked] = useState(false);

  const subtotal = r.productPriceJpy * r.quantity;
  const remaining = Math.max(0, subtotal - r.depositJpy);
  const meta = STATUS_META[r.status];

  async function sendReminder() {
    setSending(true);
    try {
      const res = await fetch("/api/admin/remind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: r.bookingId }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setReminded(true);
        setMocked(Boolean(json.mocked));
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <li className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-[15px]">{r.customerName} 様</p>
          <p className="text-xs text-gray-400 mt-0.5">
            受付 {formatCreatedAt(r.createdAt)}
          </p>
        </div>
        <span
          className={`text-[11px] font-medium rounded-full px-2.5 py-1 ${meta.cls}`}
        >
          {meta.label}
        </span>
      </div>

      <div className="mt-3 text-sm space-y-1">
        <p className="font-medium">
          {r.productName} <span className="text-gray-500">× {r.quantity}個</span>
        </p>
        <p className="text-gray-700">
          お受取: {formatDate(r.pickupDate)} {formatTimeSlot(r.pickupTimeSlot)}
        </p>
        {r.customerNote && (
          <p className="text-gray-600 bg-gray-50 rounded p-2 text-[13px]">
            ご要望: {r.customerNote}
          </p>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-sm border-t border-gray-100 pt-3">
        <div className="text-gray-600 text-[13px]">
          <span>小計 {formatJpy(subtotal)}</span>
          <span className="mx-1.5 text-gray-300">/</span>
          <span>
            予約金 {formatJpy(r.depositJpy)}
            {r.status === "confirmed" ? "（決済済）" : "（未決済）"}
          </span>
          <br />
          <span className="text-gray-400">店頭残額 {formatJpy(remaining)}</span>
        </div>
      </div>

      <div className="mt-3">
        {reminded ? (
          <p className="text-xs text-emerald-700 bg-emerald-50 rounded-lg py-2 text-center">
            ✓ リマインド送信済み{mocked ? "（デモ: LINE未設定のため擬似送信）" : ""}
          </p>
        ) : (
          <button
            onClick={sendReminder}
            disabled={sending || r.status === "cancelled"}
            className="w-full text-sm border border-primary-dark text-primary-dark rounded-lg py-2.5 font-medium active:bg-primary-light/30 disabled:opacity-40"
          >
            {sending ? "送信中..." : "LINE でお受取リマインドを送る"}
          </button>
        )}
      </div>
    </li>
  );
}
