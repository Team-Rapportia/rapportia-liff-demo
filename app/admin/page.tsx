import { redirect } from "next/navigation";
import { isAdminAuthed } from "@/lib/admin-auth";
import { listReservations, storageMode } from "@/lib/store";
import { AdminReservationList } from "@/components/AdminReservationList";

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
    <AdminReservationList
      reservations={reservations}
      storage={storageMode()}
    />
  );
}
