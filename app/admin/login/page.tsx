"use client";

import { useState } from "react";

export default function AdminLoginPage() {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "ログインに失敗しました。");
        setSubmitting(false);
        return;
      }
      window.location.href = "/admin";
    } catch {
      setError("通信エラーが発生しました。");
      setSubmitting(false);
    }
  }

  return (
    <main className="max-w-sm mx-auto px-4 py-16 min-h-screen flex flex-col justify-center">
      <header className="text-center mb-8">
        <p className="font-heading text-primary-dark text-lg">Staff</p>
        <h1 className="text-xl font-bold mt-1">予約管理 ログイン</h1>
        <p className="text-sm text-gray-600 mt-2">店主専用ページです。</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="passcode" className="block text-sm font-medium mb-2">
            合言葉
          </label>
          <input
            id="passcode"
            type="password"
            autoFocus
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-3"
            placeholder="合言葉を入力"
          />
        </div>

        {error && (
          <p className="text-sm text-accent bg-red-50 border border-red-200 rounded p-3">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || !passcode}
          className="w-full bg-primary-dark text-white font-medium py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "確認中..." : "ログイン"}
        </button>
      </form>

      <p className="text-center text-xs text-gray-400 mt-10">
        Team Rapportia デモ
      </p>
    </main>
  );
}
