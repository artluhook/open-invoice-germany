/**
 * Erzeugt ein PDF einer Rechnung ("sonstige Rechnung" i.S.d. § 14 UStG).
 * Layout enthält alle Pflichtangaben; für B2B-E-Rechnungen ist zusätzlich der
 * XRechnung-/ZUGFeRD-Export maßgeblich (XML ist führend).
 *
 * Sprachen: de (Default) oder en — gesteuert über org.language.
 */
import PDFDocument from "pdfkit";
import { formatCents, formatQuantity } from "@/lib/money";
import { getLabels, formatDate, getLocale, type PdfLabels } from "@/lib/i18n";
import type { EInvoiceData } from "@/lib/einvoice/types";

// Dokumenttyp → i18n-Key Mapping
function typeLabel(labels: PdfLabels, type: string): string {
  const map: Record<string, keyof PdfLabels> = {
    INVOICE: "invoice",
    CREDIT_NOTE: "creditNote",
    CORRECTION: "correction",
    ANGEBOT: "angebot",
    AUFTRAGSBESTAETIGUNG: "auftragsbestaetigung",
    PROFORMA: "proforma",
  };
  const key = map[type] ?? "invoice";
  return labels[key] as string;
}

export function renderInvoicePdf(data: EInvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const lang = data.language ?? "de";
    const labels = getLabels(lang);
    const cur = data.currency;
    const left = 50;
    const right = 545;

    // Kopf: Absender
    doc.fontSize(9).fillColor("#555");
    doc.text(
      `${data.seller.name} · ${data.seller.addressLine1} · ${data.seller.postalCode} ${data.seller.city}`,
      left,
      50,
    );

    // Empfänger
    doc.fillColor("#000").fontSize(11);
    doc.text(data.buyer.name, left, 110);
    if (data.buyer.contactName) doc.text(data.buyer.contactName);
    doc.text(data.buyer.addressLine1);
    if (data.buyer.addressLine2) doc.text(data.buyer.addressLine2);
    doc.text(`${data.buyer.postalCode} ${data.buyer.city}`);

    // Titel + Meta (rechts)
    doc.fontSize(18).fillColor("#111").text(typeLabel(labels, data.type), left, 110, { align: "right" });
    doc.fontSize(10).fillColor("#333");
    const metaTop = 140;
    doc.text(`${labels.numberLabel}: ${data.number}`, 300, metaTop, { align: "right" });
    doc.text(`${labels.issueDate}: ${formatDate(data.issueDate, lang)}`, { align: "right" });
    if (data.deliveryDate) doc.text(`${labels.deliveryDate}: ${formatDate(data.deliveryDate, lang)}`, { align: "right" });
    if (data.dueDate) doc.text(`${labels.dueDate}: ${formatDate(data.dueDate, lang)}`, { align: "right" });
    if (data.buyer.vatId) doc.text(`${labels.vatIdRecipient}: ${data.buyer.vatId}`, { align: "right" });

    // Positions-Tabelle
    let y = 220;
    doc.fontSize(9).fillColor("#fff");
    doc.rect(left, y, right - left, 18).fill("#1f2937");
    doc.fillColor("#fff");
    doc.text(labels.colPos, left + 4, y + 5, { width: 28 });
    doc.text(labels.colDescription, left + 36, y + 5, { width: 220 });
    doc.text(labels.colQuantity, left + 256, y + 5, { width: 50, align: "right" });
    doc.text(labels.colUnitPrice, left + 312, y + 5, { width: 70, align: "right" });
    doc.text(labels.colTax, left + 386, y + 5, { width: 35, align: "right" });
    doc.text(labels.colNet, left + 425, y + 5, { width: 70, align: "right" });
    y += 22;

    doc.fillColor("#000").fontSize(9);
    data.lines.forEach((line, i) => {
      const h = 16;
      doc.text(String(i + 1), left + 4, y, { width: 28 });
      doc.text(line.description, left + 36, y, { width: 220 });
      doc.text(`${formatQuantity(line.quantityMilli, getLocale(lang))} ${line.unit}`, left + 256, y, { width: 50, align: "right" });
      doc.text(formatCents(line.unitNetPriceCents, cur, getLocale(lang)), left + 312, y, { width: 70, align: "right" });
      doc.text(`${line.taxRate}%`, left + 386, y, { width: 35, align: "right" });
      doc.text(formatCents(line.lineNetCents, cur, getLocale(lang)), left + 425, y, { width: 70, align: "right" });
      y += h;
    });

    // Summen
    y += 10;
    doc.moveTo(left + 300, y).lineTo(right, y).strokeColor("#ccc").stroke();
    y += 6;
    const sumRow = (label: string, value: string, bold = false) => {
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(10);
      doc.text(label, left + 300, y, { width: 120, align: "right" });
      doc.text(value, left + 425, y, { width: 70, align: "right" });
      y += 16;
    };
    sumRow(labels.netTotal, formatCents(data.netTotalCents, cur, getLocale(lang)));
    for (const t of data.taxSubtotals) {
      if (t.taxCents > 0) sumRow(labels.taxSuffix.replace("{rate}", String(t.taxRate)), formatCents(t.taxCents, cur, getLocale(lang)));
    }
    sumRow(labels.grossTotal, formatCents(data.grossTotalCents, cur, getLocale(lang)), true);
    doc.font("Helvetica");

    // Pflichthinweise / Zahlungsbedingungen
    y += 16;
    doc.fontSize(9).fillColor("#333");
    if (data.notes) doc.text(data.notes, left, y, { width: right - left });
    if (data.paymentTerms) doc.moveDown(0.4).text(data.paymentTerms, { width: right - left });

    // Fußzeile: Aussteller-Pflichtangaben
    const footY = 760;
    doc.fontSize(8).fillColor("#666");
    const sellerLine = [
      data.seller.name,
      `${data.seller.addressLine1}, ${data.seller.postalCode} ${data.seller.city}`,
      data.seller.taxNumber ? `${labels.taxNumber}: ${data.seller.taxNumber}` : null,
      data.seller.vatId ? `${labels.vatId}: ${data.seller.vatId}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
    doc.text(sellerLine, left, footY, { width: right - left, align: "center" });
    const bankLine = [
      data.bankName ? `${labels.bank}: ${data.bankName}` : null,
      data.iban ? `${labels.iban}: ${data.iban}` : null,
      data.bic ? `${labels.bic}: ${data.bic}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
    if (bankLine) doc.text(bankLine, left, footY + 11, { width: right - left, align: "center" });

    doc.end();
  });
}
