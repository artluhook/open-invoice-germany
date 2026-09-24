/**
 * Löscht einen Rechnungs-ENTWURF endgültig. Nur DRAFT erlaubt — festgeschriebene
 * Belege müssen stattdessen storniert werden (GoBD, kein „Loch" im Nummernkreis:
 * Entwürfe haben noch keine Nummer). Positionen werden per Cascade mitgelöscht;
 * der DELETE_PRE_FINALIZE-Eintrag in der Hash-Chain bleibt als Spur erhalten.
 */
import { dbInternal } from "@/lib/db";
import { appendChangeLog } from "@/domain/audit";

export class DeleteDraftError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeleteDraftError";
  }
}

export interface DeleteDraftOptions {
  actor?: string;
  now?: Date;
}

export async function deleteDraftInvoice(orgId: string, invoiceId: string, opts: DeleteDraftOptions = {}) {
  const now = opts.now ?? new Date();
  const actor = opts.actor ?? "system";

  return dbInternal.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({
      where: { id: invoiceId, orgId },
      select: { id: true, status: true, type: true, grossTotalCents: true },
    });
    if (!invoice) throw new DeleteDraftError("Rechnung nicht gefunden.");
    if (invoice.status !== "DRAFT")
      throw new DeleteDraftError(
        `Nur Entwürfe können gelöscht werden (Status: ${invoice.status}). Feste Rechnungen müssen stattdessen storniert werden.`,
      );

    await tx.invoice.delete({ where: { id: invoiceId } });

    await appendChangeLog(tx, {
      orgId,
      entity: "INVOICE",
      entityId: invoiceId,
      action: "DELETE_PRE_FINALIZE",
      actor,
      at: now,
      diff: { type: invoice.type, grossTotalCents: invoice.grossTotalCents, deleted: true },
    });
  });
}
