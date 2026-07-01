"use client";

import { useState, useEffect } from "react";
import type { Product } from "@/lib/products";
import { extractCampaign } from "@/lib/campaign";
import { SlotPicker } from "./SlotPicker";
import type { AvailableSlot, SlotValue } from "./SlotPicker";

type Props = {
  products: Product[];
  liffIdToken: string;
  defaultName: string;
};

// ケーキ注文は仕込みが要るため、受付は今日から3日後以降
const LEAD_DAYS = 3;

export function ReservationForm({ products, liffIdToken, defaultName }: Props) {
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [selectedSlot, setSelectedSlot] = useState<SlotValue | null>(null);
  const [customerName, setCustomerName] = useState(defaultName);
  const [customerNote, setCustomerNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);

  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/slots")
      .then((r) => r.json())
      .then((data) => setSlots(data.slots ?? []))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, []);

  // 必須項目のエラー判定（送信を試みたあとに有効化）
  const slotError = attempted && !selectedSlot;
  const nameError = attempted && !customerName;

  const selected = products.find((p) => p.id === productId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAttempted(true);

    if (!selectedSlot || !customerName) {
      setError("赤枠の項目を入力してください。");
      return;
    }

    setError(null);
    setSubmitting(true);

    // 攻めPUSH のリンク（?camp=...）から来た予約に流入元の印を付ける。
    // 通常の予約は空 → サーバー側で 'organic' に丸められる。UI には一切影響しない。
    const source = extractCampaign(
      typeof window !== "undefined" ? window.location.search : ""
    );

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          quantity,
          pickupDate: selectedSlot.date,
          pickupTimeSlot: selectedSlot.timeSlot,
          customerName,
          customerNote,
          liffIdToken,
          source,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.checkoutUrl) {
        setError(json.error ?? "予約に失敗しました。時間を置いて再度お試しください。");
        setSubmitting(false);
        return;
      }

      window.location.href = json.checkoutUrl;
    } catch {
      setError("通信エラーが発生しました。電波の良い場所で再度お試しください。");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section>
        <label className="block text-sm font-medium mb-2">商品</label>
        <div className="space-y-2">
          {products.map((p) => (
            <label
              key={p.id}
              className={`block border rounded-lg p-3 cursor-pointer transition ${
                productId === p.id
                  ? "border-primary bg-primary-light/30"
                  : "border-gray-200"
              }`}
            >
              <input
                type="radio"
                name="productId"
                value={p.id}
                checked={productId === p.id}
                onChange={() => setProductId(p.id)}
                className="sr-only"
              />
              <div className="flex justify-between items-baseline">
                <span className="font-medium">{p.name}</span>
                <span className="text-primary-dark font-semibold">
                  ¥{p.priceJpy.toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">{p.description}</p>
            </label>
          ))}
        </div>
      </section>

      <section>
        <label className="block text-sm font-medium mb-2">数量</label>
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              type="button"
              key={n}
              onClick={() => setQuantity(n)}
              className={`py-3 rounded-lg border transition ${
                quantity === n
                  ? "bg-primary text-white border-primary"
                  : "bg-white border-gray-300"
              }`}
            >
              {n}個
            </button>
          ))}
        </div>
      </section>

      <section>
        <label className="block text-sm font-medium mb-2">
          お受取日時（3日以上先）
          {slotError && (
            <span className="text-accent ml-2 text-xs">※ 日時を選択してください</span>
          )}
        </label>
        {slotsLoading ? (
          <p className="text-sm text-gray-400 py-6 text-center">
            空き状況を確認中...
          </p>
        ) : (
          <div
            className={`rounded-xl border p-3 transition ${
              slotError ? "border-accent border-2 bg-red-50" : "border-gray-200"
            }`}
          >
            <SlotPicker
              slots={slots}
              value={selectedSlot}
              onSelect={setSelectedSlot}
              leadDays={LEAD_DAYS}
            />
          </div>
        )}
      </section>

      <section>
        <label htmlFor="customer-name" className="block text-sm font-medium mb-2">
          お名前
          {nameError && <span className="text-accent ml-2 text-xs">※ 必須項目です</span>}
        </label>
        <input
          id="customer-name"
          type="text"
          required
          maxLength={40}
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          aria-invalid={nameError}
          className={`w-full border rounded-lg p-3 transition ${
            nameError
              ? "border-accent border-2 bg-red-50"
              : "border-gray-300"
          }`}
        />
      </section>

      <section>
        <label htmlFor="customer-note" className="block text-sm font-medium mb-2">
          ご要望（任意・メッセージプレートなど）
        </label>
        <textarea
          id="customer-note"
          maxLength={500}
          value={customerNote}
          onChange={(e) => setCustomerNote(e.target.value)}
          rows={3}
          className="w-full border border-gray-300 rounded-lg p-3"
        />
      </section>

      {error && (
        <p className="text-sm text-accent bg-red-50 border border-red-200 rounded p-3">
          {error}
        </p>
      )}

      <div className="pt-2">
        <p className="text-xs text-gray-600 mb-3">
          ご予約には予約金として¥
          {Number(process.env.NEXT_PUBLIC_DEPOSIT_AMOUNT_JPY ?? 2000).toLocaleString()}{" "}
          を Stripe にてお預かりします（残額は店頭にて）。
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-primary-dark text-white font-medium py-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting
            ? "決済画面へ移動中..."
            : selected
              ? `Stripe で予約金を支払う（小計 ¥${(selected.priceJpy * quantity).toLocaleString()}）`
              : "Stripe で予約金を支払う"}
        </button>
      </div>
    </form>
  );
}
