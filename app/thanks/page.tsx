export const dynamic = "force-dynamic";

export default function ThanksPage({
  searchParams,
}: {
  searchParams: { bid?: string };
}) {
  const bookingId = searchParams.bid;

  return (
    <main className="max-w-md mx-auto px-4 py-12 min-h-screen flex flex-col items-center justify-center text-center">
      <p className="font-heading text-primary-dark text-lg">Thank you</p>
      <h1 className="text-2xl font-bold mt-2">ご予約ありがとうございます</h1>

      <div className="bg-white border border-gray-200 rounded-lg p-6 mt-8 w-full">
        <p className="text-sm text-gray-600">予約金のお支払いが完了しました。</p>
        {bookingId && (
          <p className="mt-4 text-sm">
            予約番号:{" "}
            <span className="font-mono font-semibold">{bookingId}</span>
          </p>
        )}
        <p className="mt-4 text-sm text-gray-600">
          ご予約内容と受取日のリマインダーは LINE トークでお送りいたします。
        </p>
      </div>

      <p className="text-xs text-gray-500 mt-8">
        このタブを閉じて LINE トークへお戻りください。
      </p>
    </main>
  );
}
