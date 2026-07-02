import { LiffGate } from "@/components/LiffGate";
import { PRODUCTS } from "@/lib/products";
import { clientEnv } from "@/lib/env";

export default function Page() {
  return (
    <main className="max-w-md md:max-w-xl mx-auto px-4 py-6 md:py-12 min-h-screen">
      <div className="md:bg-white md:rounded-2xl md:border md:border-gray-200 md:shadow-sm md:px-10 md:py-10">
        <header className="text-center mb-8">
          <p className="font-heading text-primary-dark text-lg md:text-xl">
            Reservation
          </p>
          <h1 className="text-2xl md:text-3xl font-bold mt-1">
            ホールケーキご予約
          </h1>
          <p className="text-sm text-gray-600 mt-2">
            お受取日の3日前までにご予約ください。
          </p>
        </header>

        <LiffGate liffId={clientEnv.liffId} products={PRODUCTS} />
      </div>

      <footer className="text-center text-xs text-gray-500 mt-8 md:mt-10 pb-8">
        Team Rapportia デモ予約フォーム
      </footer>
    </main>
  );
}
