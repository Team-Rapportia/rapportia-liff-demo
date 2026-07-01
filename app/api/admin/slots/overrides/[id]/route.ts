import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { deleteSlotOverride } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  if (!isAdminAuthed()) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await deleteSlotOverride(params.id);
  return NextResponse.json({ ok: true });
}
