"use client";

import { useState, useEffect } from "react";
import type { WeeklyPattern, SlotOverride } from "@/lib/store";
import { formatDate, formatTimeSlot } from "@/lib/format";

const DOW_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

export function AdminSlotManager() {
  const [loading, setLoading] = useState(true);
  const [overrides, setOverrides] = useState<SlotOverride[]>([]);
  const [saving, setSaving] = useState(false);
  const [addingOverride, setAddingOverride] = useState(false);

  // 7 rows × 2 cols: grid[dow][0=am, 1=pm]
  const [grid, setGrid] = useState<boolean[][]>(
    Array.from({ length: 7 }, () => [false, false])
  );

  const [newDate, setNewDate] = useState("");
  const [newTimeSlot, setNewTimeSlot] = useState<"am" | "pm">("am");
  const [newEnabled, setNewEnabled] = useState(false);

  useEffect(() => {
    fetch("/api/admin/slots")
      .then((r) => r.json())
      .then((data) => {
        const patterns: WeeklyPattern[] = data.patterns ?? [];
        const nextGrid = Array.from({ length: 7 }, () => [false, false]);
        for (const p of patterns) {
          nextGrid[p.dayOfWeek][p.timeSlot === "am" ? 0 : 1] = p.enabled;
        }
        setGrid(nextGrid);
        setOverrides(data.overrides ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  function toggleCell(dow: number, tsIdx: number) {
    setGrid((prev) => {
      const next = prev.map((row) => [...row]);
      next[dow][tsIdx] = !next[dow][tsIdx];
      return next;
    });
  }

  async function savePatterns() {
    setSaving(true);
    try {
      const patterns = [];
      for (let dow = 0; dow < 7; dow++) {
        for (let tsIdx = 0; tsIdx < 2; tsIdx++) {
          patterns.push({
            dayOfWeek: dow,
            timeSlot: tsIdx === 0 ? "am" : "pm",
            enabled: grid[dow][tsIdx],
          });
        }
      }
      await fetch("/api/admin/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patterns }),
      });
    } finally {
      setSaving(false);
    }
  }

  async function addOverride() {
    if (!newDate) return;
    setAddingOverride(true);
    try {
      const res = await fetch("/api/admin/slots/overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: newDate,
          timeSlot: newTimeSlot,
          enabled: newEnabled,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setOverrides((prev) => {
          const filtered = prev.filter((o) => o.id !== data.override.id);
          return [...filtered, data.override].sort(
            (a, b) => a.date.localeCompare(b.date) || a.timeSlot.localeCompare(b.timeSlot)
          );
        });
        setNewDate("");
      }
    } finally {
      setAddingOverride(false);
    }
  }

  async function removeOverride(id: string) {
    const res = await fetch(`/api/admin/slots/overrides/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setOverrides((prev) => prev.filter((o) => o.id !== id));
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-400 py-4">枠設定を読み込み中...</p>;
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().slice(0, 10);

  return (
    <section>
      <h2 className="text-base font-bold mb-3">予約枠の設定</h2>

      {/* 週次パターン */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-3">
        <h3 className="text-sm font-semibold mb-3 text-gray-700">
          週次パターン
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left font-normal text-gray-400 pb-2 w-6"></th>
              <th className="text-center font-normal text-gray-500 pb-2 text-xs">
                午前
                <br />
                10–12時
              </th>
              <th className="text-center font-normal text-gray-500 pb-2 text-xs">
                午後
                <br />
                15–18時
              </th>
            </tr>
          </thead>
          <tbody>
            {DOW_LABELS.map((label, dow) => (
              <tr key={dow} className="border-t border-gray-100">
                <td className="py-2 text-gray-600 text-sm">{label}</td>
                {[0, 1].map((tsIdx) => (
                  <td key={tsIdx} className="py-2 text-center">
                    <input
                      type="checkbox"
                      checked={grid[dow][tsIdx]}
                      onChange={() => toggleCell(dow, tsIdx)}
                      className="w-5 h-5 cursor-pointer accent-primary-dark"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <button
          onClick={savePatterns}
          disabled={saving}
          className="mt-3 w-full text-sm bg-primary-dark text-white rounded-lg py-2.5 font-medium disabled:opacity-50"
        >
          {saving ? "保存中..." : "パターンを保存"}
        </button>
      </div>

      {/* 例外（臨時追加・休み） */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold mb-3 text-gray-700">
          例外（臨時追加・休み）
        </h3>

        <div className="bg-gray-50 rounded-lg p-3 space-y-2 mb-3">
          <p className="text-xs text-gray-500 font-medium">日付と時間帯を指定</p>
          <div className="flex gap-2">
            <input
              type="date"
              value={newDate}
              min={minDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg p-2 text-sm"
            />
            <select
              value={newTimeSlot}
              onChange={(e) =>
                setNewTimeSlot(e.target.value as "am" | "pm")
              }
              className="border border-gray-300 rounded-lg p-2 text-sm"
            >
              <option value="am">午前</option>
              <option value="pm">午後</option>
            </select>
          </div>
          <div className="flex gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                checked={!newEnabled}
                onChange={() => setNewEnabled(false)}
              />
              <span className="text-sm">🔴 休み</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                checked={newEnabled}
                onChange={() => setNewEnabled(true)}
              />
              <span className="text-sm">🟢 臨時追加</span>
            </label>
          </div>
          <button
            onClick={addOverride}
            disabled={!newDate || addingOverride}
            className="w-full text-sm border border-primary-dark text-primary-dark rounded-lg py-2 font-medium disabled:opacity-40"
          >
            {addingOverride ? "追加中..." : "追加する"}
          </button>
        </div>

        {overrides.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-2">
            例外は設定されていません
          </p>
        ) : (
          <ul className="space-y-2">
            {overrides.map((o) => (
              <li
                key={o.id}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[11px] font-medium rounded-full px-2 py-0.5 ${
                      o.enabled
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {o.enabled ? "臨時追加" : "休み"}
                  </span>
                  <span className="text-gray-700">
                    {formatDate(o.date)} {formatTimeSlot(o.timeSlot)}
                  </span>
                </div>
                <button
                  onClick={() => removeOverride(o.id)}
                  className="text-xs text-gray-400 hover:text-accent px-2 py-1"
                >
                  削除
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
