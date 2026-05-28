"use client";

import { useState } from "react";
import type { Product } from "@/lib/products";

type Props = {
  products: Product[];
  liffIdToken: string;
  defaultName: string;
};

export function ReservationForm({ products, liffIdToken, defaultName }: Props) {
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTimeSlot, setPickupTimeSlot] = useState<"am" | "pm">("am");
  const [customerName, setCustomerName] = useState(defaultName);
  const [customerNote, setCustomerNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = products.find((p) => p.id === productId);

  // 最短お受取日：当日から 3 日後
  const minDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  })();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          pickupDate,
          pickupTimeSlot,
          customerName,
          customerNote,
          liffIdToken,
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
        <label htmlFor="pickup-date" className="block text-sm font-medium mb-2">
          お受取日（3日以上先）
        </label>
        <input
          id="pickup-date"
          type="date"
          required
          min={minDate}
          value={pickupDate}
          onChange={(e) => setPickupDate(e.target.value)}
          className="w-full border border-gray-300 rounded-lg p-3"
        />
      </section>

      <section>
        <label className="block text-sm font-medium mb-2">お受取時間帯</label>
        <div className="grid grid-cols-2 gap-2">
          {(["am", "pm"] as const).map((slot) => (
            <button
              type="button"
              key={slot}
              onClick={() => setPickupTimeSlot(slot)}
              className={`p-3 rounded-lg border transition ${
                pickupTimeSlot === slot
                  ? "bg-primary text-white border-primary"
                  : "bg-white border-gray-300"
              }`}
            >
              {slot === "am" ? "午前 10:00 - 12:00" : "午後 15:00 - 18:00"}
            </button>
          ))}
        </div>
      </section>

      <section>
        <label htmlFor="customer-name" className="block text-sm font-medium mb-2">
          お名前
        </label>
        <input
          id="customer-name"
          type="text"
          required
          maxLength={40}
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          className="w-full border border-gray-300 rounded-lg p-3"
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
          disabled={submitting || !pickupDate || !customerName}
          className="w-full bg-primary-dark text-white font-medium py-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting
            ? "決済画面へ移動中..."
            : `Stripe で予約金を支払う（${selected ? `¥${selected.priceJpy.toLocaleString()}の` : ""}ご予約）`}
        </button>
      </div>
    </form>
  );
}
