import { NextResponse } from "next/server";
import { z } from "zod";
import { createInvoiceSchema } from "@/schemas";
import { updateDraftInvoice, UpdateDraftError } from "@/domain/invoice/update";
import { deleteDraftInvoice, DeleteDraftError } from "@/domain/invoice/delete";
import { getActiveOrg } from "@/lib/org";

export const runtime = "nodejs";

/** Entwurf aktualisieren (nur Status DRAFT). */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const org = await getActiveOrg();
    const input = createInvoiceSchema.parse(await req.json());
    const invoice = await updateDraftInvoice(org.id, id, input);
    return NextResponse.json({ id: invoice.id, status: invoice.status });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Validierung fehlgeschlagen", issues: e.issues }, { status: 400 });
    }
    if (e instanceof UpdateDraftError) {
      return NextResponse.json({ error: e.message }, { status: 409 });
    }
    console.error("PUT /api/invoices/[id]:", e);
    return NextResponse.json({ error: "Entwurf konnte nicht gespeichert werden. Bitte Eingaben prüfen." }, { status: 400 });
  }
}

/** Entwurf endgültig löschen (nur Status DRAFT, mit Audit-Eintrag). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const org = await getActiveOrg();
    await deleteDraftInvoice(org.id, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof DeleteDraftError) {
      return NextResponse.json({ error: e.message }, { status: 409 });
    }
    console.error("DELETE /api/invoices/[id]:", e);
    return NextResponse.json({ error: "Entwurf konnte nicht gelöscht werden." }, { status: 400 });
  }
}
