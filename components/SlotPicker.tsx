"use client";

import { useState } from "react";
import { DayPicker } from "react-day-picker";

export type AvailableSlot = {
  date: string; // YYYY-MM-DD
  timeSlots: ("am" | "pm")[];
};

export type SlotValue = { date: string; timeSlot: "am" | "pm" };

type Props = {
  slots: AvailableSlot[];
  value: SlotValue | null;
  onSelect: (v: SlotValue) => void;
  /** 予約可能な最短日（今日から何日後か）。ケーキ注文は仕込みが要るため既定3日 */
  leadDays?: number;
};

const SLOT_LABELS: Record<"am" | "pm", string> = {
  am: "午前 10:00–12:00",
  pm: "午後 15:00–18:00",
};

const DOW_JA = ["日", "月", "火", "水", "木", "金", "土"];

function parseDateStr(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function SlotPicker({ slots, value, onSelect, leadDays = 1 }: Props) {
  const [pickedDate, setPickedDate] = useState<Date | undefined>(
    value ? parseDateStr(value.date) : undefined
  );

  const slotMap = new Map(slots.map((s) => [s.date, s.timeSlots]));

  const minDate = new Date();
  minDate.setHours(0, 0, 0, 0);
  minDate.setDate(minDate.getDate() + leadDays);

  const maxDate = new Date();
  maxDate.setHours(0, 0, 0, 0);
  maxDate.setDate(maxDate.getDate() + 60);

  // 月ナビゲーションは常に今日〜60日後の範囲で固定
  const startMonthDate = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  const endMonthDate = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);

  const pickedStr = pickedDate ? toDateStr(pickedDate) : null;
  const availableTimeSlots = pickedStr ? (slotMap.get(pickedStr) ?? []) : [];
  const hasAnySlots = slots.length > 0;

  return (
    <div>
      <DayPicker
        mode="single"
        selected={pickedDate}
        onSelect={(day) => {
          if (!day) return;
          const str = toDateStr(day);
          if (!slotMap.has(str)) return;
          setPickedDate(day);
        }}
        startMonth={startMonthDate}
        endMonth={endMonthDate}
        showOutsideDays={false}
        disabled={[
          { before: minDate },
          { after: maxDate },
          (day: Date) => !slotMap.has(toDateStr(day)),
        ]}
        formatters={{
          formatWeekdayName: (d) => DOW_JA[d.getDay()],
          formatCaption: (d) =>
            `${d.getFullYear()}年 ${d.getMonth() + 1}月`,
        }}
        style={
          {
            "--rdp-accent-color": "#152D4A",
            "--rdp-accent-background-color": "#dde9f0",
            "--rdp-day-height": "40px",
            "--rdp-day-width": "40px",
            "--rdp-day_button-height": "36px",
            "--rdp-day_button-width": "36px",
            "--rdp-disabled-opacity": "0.25",
            "--rdp-outside-opacity": "0",
          } as React.CSSProperties
        }
      />

      <p className="text-xs text-gray-400 text-center -mt-2 mb-1">
        グレーアウトの日は定休日・受付不可です
      </p>

      {!hasAnySlots && (
        <p className="text-sm text-gray-500 text-center py-2 bg-gray-50 rounded-lg border border-gray-100">
          現在受付可能な日がございません。
          <br />
          <span className="text-xs">しばらく後に再度ご確認ください。</span>
        </p>
      )}

      {pickedStr && (
        <div className="mt-3">
          <p className="text-sm font-medium mb-2">
            {pickedStr.replace(/-/g, "/")} の時間帯を選択
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(["am", "pm"] as const).map((ts) => {
              const isAvail = availableTimeSlots.includes(ts);
              const isSel =
                value?.date === pickedStr && value?.timeSlot === ts;
              return (
                <button
                  key={ts}
                  type="button"
                  disabled={!isAvail}
                  onClick={() =>
                    isAvail && onSelect({ date: pickedStr, timeSlot: ts })
                  }
                  className={`p-3 rounded-lg border text-sm transition ${
                    !isAvail
                      ? "opacity-30 cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400"
                      : isSel
                      ? "bg-primary-dark text-white border-primary-dark"
                      : "bg-white border-gray-300 hover:border-primary-dark"
                  }`}
                >
                  {SLOT_LABELS[ts]}
                  {!isAvail && (
                    <span className="block text-xs mt-0.5">満席</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
