import { LiffGate } from "@/components/LiffGate";
import { PRODUCTS } from "@/lib/products";
import { clientEnv } from "@/lib/env";

export default function Page() {
  return (
    <main className="max-w-md mx-auto px-4 py-6 min-h-screen">
      <header className="text-center mb-8">
        <p className="font-heading text-primary-dark text-lg">Reservation</p>
        <h1 className="text-2xl font-bold mt-1">ホールケーキご予約</h1>
        <p className="text-sm text-gray-600 mt-2">
          お受取日の3日前までにご予約ください。
        </p>
      </header>

      <LiffGate liffId={clientEnv.liffId} products={PRODUCTS} />

      <footer className="text-center text-xs text-gray-500 mt-12 pb-8">
        Team Rapportia デモ予約フォーム
      </footer>
    </main>
  );
}
