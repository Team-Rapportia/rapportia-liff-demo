"use client";

import { useEffect, useState } from "react";
import { clientEnv } from "@/lib/env";

type State =
  | { kind: "loading" }
  | { kind: "denied"; lineUserId: string }
  | { kind: "error"; message: string };

export default function AdminLoginPage() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!clientEnv.liffId) {
        setState({
          kind: "error",
          message: "LIFF ID が未設定です。管理者にお問い合わせください。",
        });
        return;
      }

      let step = "import";
      try {
        const liff = (await import("@line/liff")).default;

        step = "init";
        await liff.init({ liffId: clientEnv.liffId });

        step = "isLoggedIn";
        if (!liff.isLoggedIn()) {
          step = "login";
          liff.login();
          return;
        }

        step = "getIDToken";
        const idToken = liff.getIDToken();
        if (!idToken) {
          setState({
            kind: "error",
            message: `[debug] idToken=null (step=${step})`,
          });
          return;
        }

        step = "verify";
        const res = await fetch("/api/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });

        if (res.ok) {
          window.location.href = "/admin";
          return;
        }

        const json = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (res.status === 403 && typeof json.lineUserId === "string") {
          setState({ kind: "denied", lineUserId: json.lineUserId });
          return;
        }
        setState({
          kind: "error",
          message: json.error ?? "ログインに失敗しました。",
        });
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
          setState({ kind: "error", message: `[debug step=${step}] ${msg}` });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function copyId(id: string) {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // クリップボード不可環境では手動コピーに委ねる
    }
  }

  return (
    <main className="max-w-sm mx-auto px-4 py-16 min-h-screen flex flex-col justify-center">
      <header className="text-center mb-8">
        <p className="font-heading text-primary-dark text-lg">Staff</p>
        <h1 className="text-xl font-bold mt-1">予約管理 ログイン</h1>
        <p className="text-sm text-gray-600 mt-2">
          店舗スタッフ専用ページです（LINE で認証）。
        </p>
      </header>

      {state.kind === "loading" && (
        <p className="text-center text-gray-500 py-8">LINE で認証中...</p>
      )}

      {state.kind === "denied" && (
        <div className="space-y-4">
          <p className="text-sm text-accent bg-red-50 border border-red-200 rounded-lg p-3">
            この LINE アカウントには管理者権限がありません。
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-600 mb-2">
              あなたの LINE ユーザーID（このIDを管理者に伝えて登録を依頼してください）
            </p>
            <p className="font-mono text-[13px] break-all bg-white border border-gray-200 rounded p-2">
              {state.lineUserId}
            </p>
            <button
              onClick={() => copyId(state.lineUserId)}
              className="w-full mt-3 bg-primary-dark text-white text-sm font-medium py-2.5 rounded-lg active:opacity-80"
            >
              {copied ? "✓ コピーしました" : "IDをコピー"}
            </button>
          </div>
        </div>
      )}

      {state.kind === "error" && (
        <p className="text-sm text-accent bg-red-50 border border-red-200 rounded-lg p-3">
          {state.message}
        </p>
      )}

      <p className="text-center text-xs text-gray-400 mt-10">
        Team Rapportia デモ
      </p>
    </main>
  );
}
