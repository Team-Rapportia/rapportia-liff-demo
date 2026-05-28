"use client";

import { useEffect, useState } from "react";
import { ReservationForm } from "./ReservationForm";
import type { Product } from "@/lib/products";

type Props = {
  liffId: string;
  products: Product[];
};

type Profile = { displayName: string };

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; idToken: string; profile: Profile };

export function LiffGate({ liffId, products }: Props) {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!liffId) {
        setState({
          kind: "error",
          message:
            "LIFF ID が設定されていません。管理者にお問い合わせください。",
        });
        return;
      }

      try {
        const liff = (await import("@line/liff")).default;
        await liff.init({ liffId });

        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }

        const idToken = liff.getIDToken();
        if (!idToken) {
          setState({
            kind: "error",
            message: "LINE 認証情報を取得できませんでした。",
          });
          return;
        }

        const profile = await liff.getProfile();
        if (!cancelled) {
          setState({
            kind: "ready",
            idToken,
            profile: { displayName: profile.displayName },
          });
        }
      } catch {
        if (!cancelled) {
          setState({
            kind: "error",
            message:
              "LINE 連携に失敗しました。LINE アプリから開き直してください。",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [liffId]);

  if (state.kind === "loading") {
    return (
      <p className="text-center text-gray-500 py-12">読み込み中...</p>
    );
  }

  if (state.kind === "error") {
    return (
      <p className="text-center text-accent bg-red-50 border border-red-200 rounded p-4">
        {state.message}
      </p>
    );
  }

  return (
    <ReservationForm
      products={products}
      liffIdToken={state.idToken}
      defaultName={state.profile.displayName}
    />
  );
}
