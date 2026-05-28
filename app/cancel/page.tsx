export const dynamic = "force-dynamic";

export default function CancelPage() {
  return (
    <main className="max-w-md mx-auto px-4 py-12 min-h-screen flex flex-col items-center justify-center text-center">
      <h1 className="text-2xl font-bold">ご予約はキャンセルされました</h1>
      <p className="text-sm text-gray-600 mt-4">
        お支払いは完了していません。再度ご予約いただく場合は LINE
        トークからこちらのフォームを開き直してください。
      </p>
      <p className="text-xs text-gray-500 mt-8">
        ご不明点はそのまま LINE トークでお問い合わせください。
      </p>
    </main>
  );
}
