import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getActiveOrg } from "@/lib/org";
import { NewInvoiceForm, type InvoiceFormInitial } from "@/components/NewInvoiceForm";
import { NeedOrgNotice } from "@/components/NeedOrgNotice";

export const dynamic = "force-dynamic";

function isoDate(d: Date | null | undefined) {
  return d ? new Date(d).toISOString().slice(0, 10) : "";
}

/** Rechnungs-ENTWURF bearbeiten. Nur für Status DRAFT — festgeschriebene Belege leiten zur Detailseite um. */
export default async function EditInvoiceDraftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let orgId: string;
  try {
    orgId = (await getActiveOrg()).id;
  } catch {
    return <NeedOrgNotice />;
  }

  const invoice = await prisma.invoice.findFirst({
    where: { id, orgId },
    include: { lines: { orderBy: { position: "asc" } } },
  });
  if (!invoice) notFound();
  if (invoice.status !== "DRAFT") redirect(`/rechnungen/${id}`);

  const [customers, products] = await Promise.all([
    prisma.customer.findMany({ where: { orgId, isArchived: false }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.product.findMany({
      where: { orgId, isArchived: false },
      select: { id: true, name: true, unit: true, netPriceCents: true, taxRate: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const initial: InvoiceFormInitial = {
    customerId: invoice.customerId,
    taxScheme: invoice.taxScheme,
    currency: invoice.currency,
    deliveryDate: isoDate(invoice.deliveryDate),
    dueDate: isoDate(invoice.dueDate),
    notes: invoice.notes ?? "",
    paymentTerms: invoice.paymentTerms ?? "",
    lines: invoice.lines.map((l) => ({
      description: l.description,
      quantity: String(l.quantityMilli / 1000),
      unit: l.unit,
      price: (l.unitNetPriceCents / 100).toFixed(2),
      taxRate: l.taxRate,
    })),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/rechnungen/${id}`} className="text-sm text-slate-500 hover:text-slate-800">
          ← Zurück zum Entwurf
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Rechnungsentwurf bearbeiten</h1>
      </div>
      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        Dieser Entwurf hat noch keine Rechnungsnummer. Nach dem Festschreiben ist die Rechnung GoBD-konform unveränderbar.
      </div>
      <NewInvoiceForm customers={customers} products={products} invoiceId={invoice.id} initial={initial} />
    </div>
  );
}
