/**
 * Aktualisiert einen Rechnungs-ENTWURF. Nur solange der Status DRAFT ist,
 * sind Änderungen erlaubt (GoBD: nach Festschreibung Unveränderbarkeit).
 * Ersetzt Kopfdaten und Positionen vollständig und berechnet Summen neu.
 */
import { dbInternal } from "@/lib/db";
import { computeLineNetCents } from "@/lib/money";
import { computeTaxBreakdown } from "@/lib/tax";
import { appendChangeLog } from "@/domain/audit";
import type { CreateInvoiceInput } from "@/schemas";

export class UpdateDraftError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UpdateDraftError";
  }
}

export interface UpdateDraftOptions {
  actor?: string;
  now?: Date;
}

export async function updateDraftInvoice(
  orgId: string,
  invoiceId: string,
  input: CreateInvoiceInput,
  opts: UpdateDraftOptions = {},
) {
  const now = opts.now ?? new Date();
  const actor = opts.actor ?? "system";

  const lines = input.lines.map((line, index) => ({
    position: index + 1,
    productId: line.productId,
    description: line.description,
    quantityMilli: line.quantityMilli,
    unit: line.unit,
    unitNetPriceCents: line.unitNetPriceCents,
    taxRate: line.taxRate,
    taxCategory: line.taxCategory,
    discountPermille: line.discountPermille,
    lineNetCents: computeLineNetCents(line.quantityMilli, line.unitNetPriceCents, line.discountPermille),
  }));

  const totals = computeTaxBreakdown(
    lines.map((l) => ({ lineNetCents: l.lineNetCents, taxRate: l.taxRate, taxCategory: l.taxCategory })),
  );

  return dbInternal.$transaction(async (tx) => {
    // Entwurf muss zur Organisation gehören und DRAFT sein.
    const invoice = await tx.invoice.findFirst({ where: { id: invoiceId, orgId }, select: { id: true, status: true } });
    if (!invoice) throw new UpdateDraftError("Rechnung nicht gefunden.");
    if (invoice.status !== "DRAFT")
      throw new UpdateDraftError(`Nur Entwürfe können bearbeitet werden (Status: ${invoice.status}).`);

    // Kunde muss zur Organisation gehören (kein Cross-Tenant-Bezug).
    const customer = await tx.customer.findFirst({ where: { id: input.customerId, orgId }, select: { id: true } });
    if (!customer) throw new UpdateDraftError("Kunde nicht gefunden.");

    const updated = await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        customerId: input.customerId,
        type: input.type,
        taxScheme: input.taxScheme,
        currency: input.currency,
        deliveryDate: input.deliveryDate,
        deliveryStart: input.deliveryStart,
        deliveryEnd: input.deliveryEnd,
        dueDate: input.dueDate,
        buyerReference: input.buyerReference,
        notes: input.notes,
        paymentTerms: input.paymentTerms,
        netTotalCents: totals.netTotalCents,
        taxTotalCents: totals.taxTotalCents,
        grossTotalCents: totals.grossTotalCents,
        taxBreakdownJson: JSON.stringify(totals.breakdown),
        lines: { deleteMany: {}, create: lines },
      },
      include: { lines: { orderBy: { position: "asc" } } },
    });

    await appendChangeLog(tx, {
      orgId,
      entity: "INVOICE",
      entityId: updated.id,
      action: "UPDATE",
      actor,
      at: now,
      diff: { type: input.type, taxScheme: input.taxScheme, grossTotalCents: totals.grossTotalCents },
    });

    return updated;
  });
}
