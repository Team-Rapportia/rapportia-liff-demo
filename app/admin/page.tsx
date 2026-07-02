import { redirect } from "next/navigation";
import { isAdminAuthed } from "@/lib/admin-auth";
import { listReservations, storageMode } from "@/lib/store";
import { AdminReservationList } from "@/components/AdminReservationList";
import { AdminSlotManager } from "@/components/AdminSlotManager";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "予約管理 | ラポーティアケーキ",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  if (!isAdminAuthed()) {
    redirect("/admin/login");
  }

  const reservations = await listReservations();
  return (
    <main className="min-h-screen bg-bg">
      <div className="max-w-6xl mx-auto px-4 py-5 md:py-8">
        <header className="mb-5 md:mb-8">
          <p className="font-heading text-primary-dark text-base leading-none">
            Admin
          </p>
          <h1 className="text-lg md:text-2xl font-bold mt-1">予約管理</h1>
        </header>

        <div className="lg:grid lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-8 lg:items-start">
          <div className="mb-8 lg:mb-0 lg:sticky lg:top-8">
            <AdminSlotManager />
          </div>
          <AdminReservationList
            reservations={reservations}
            storage={storageMode()}
          />
        </div>
      </div>
    </main>
  );
}
