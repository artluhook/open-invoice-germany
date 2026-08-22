/** PDF einer Mahnung / Zahlungserinnerung. */
import PDFDocument from "pdfkit";
import { formatCents } from "@/lib/money";
import { getLabels, formatDate, getLocale, countryName, type PdfLabels } from "@/lib/i18n";

export interface DunningPdfData {
  number: string;
  level: number;
  sentDate: Date;
  newDueDate: Date;
  currency: string;
  language?: string; // de | en
  seller: {
    name: string;
    addressLine1: string;
    postalCode: string;
    city: string;
    taxNumber?: string | null;
    vatId?: string | null;
    iban?: string | null;
    bic?: string | null;
    bankName?: string | null;
  };
  buyer: {
    name: string;
    contactName?: string | null;
    addressLine1: string;
    addressLine2?: string | null;
    postalCode: string;
    city: string;
    countryCode?: string | null;
  };
  invoiceNumber: string;
  invoiceDate: Date;
  openAmountCents: number;
  interestCents: number;
  flatFee40Cents: number;
  lateFeeCents: number;
  totalCents: number;
  daysOverdue: number;
}

function levelTitle(labels: PdfLabels, level: number): string {
  if (level === 0) return labels.dunningLevel0Title;
  if (level === 1) return labels.dunningLevel1Title;
  return labels.dunningLevel2Title;
}

function introText(labels: PdfLabels, level: number, invoiceNo: string): string {
  if (level === 0) return labels.dunningIntro0(invoiceNo);
  if (level === 1) return labels.dunningIntro1(invoiceNo);
  return labels.dunningIntro2(invoiceNo);
}

export function renderDunningPdf(data: DunningPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const lang = data.language ?? "de";
    const labels = getLabels(lang);
    const locale = getLocale(lang);
    const cur = data.currency;
    const left = 50;
    const right = 545;
    const title = levelTitle(labels, data.level);

    doc.fontSize(9).fillColor("#555");
    doc.text(`${data.seller.name} · ${data.seller.addressLine1} · ${data.seller.postalCode} ${data.seller.city}`, left, 50);

    doc.fillColor("#000").fontSize(11);
    doc.text(data.buyer.name, left, 110);
    if (data.buyer.contactName) doc.text(data.buyer.contactName);
    doc.text(data.buyer.addressLine1);
    if (data.buyer.addressLine2) doc.text(data.buyer.addressLine2);
    doc.text(`${data.buyer.postalCode} ${data.buyer.city}`);
    if (data.buyer.countryCode && data.buyer.countryCode !== "DE") {
      doc.text(countryName(data.buyer.countryCode, lang));
    }

    doc.fontSize(18).fillColor("#111").text(title, left, 110, { align: "right" });
    doc.fontSize(10).fillColor("#333");
    doc.text(`${labels.dunningNumber}: ${data.number}`, 300, 140, { align: "right" });
    doc.text(`${labels.dunningDate}: ${formatDate(data.sentDate, lang)}`, { align: "right" });

    doc.fontSize(11).fillColor("#000").text(labels.dunningSalutation, left, 200);
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor("#333").text(introText(labels, data.level, data.invoiceNumber), { width: right - left });

    // Aufstellung
    let y = 290;
    const row = (label: string, value: string, bold = false) => {
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(10).fillColor("#000");
      doc.text(label, left, y, { width: 360 });
      doc.text(value, left + 360, y, { width: right - left - 360, align: "right" });
      y += 16;
    };
    row(labels.dunningOpenAmount(data.invoiceNumber, formatDate(data.invoiceDate, lang)), formatCents(data.openAmountCents, cur, locale));
    if (data.interestCents > 0) row(labels.dunningInterest(String(data.daysOverdue)), formatCents(data.interestCents, cur, locale));
    if (data.flatFee40Cents > 0) row(labels.dunningFlatFee, formatCents(data.flatFee40Cents, cur, locale));
    if (data.lateFeeCents > 0) row(labels.dunningLateFee, formatCents(data.lateFeeCents, cur, locale));
    y += 4;
    doc.moveTo(left, y).lineTo(right, y).strokeColor("#ccc").stroke();
    y += 6;
    row(labels.dunningTotal, formatCents(data.totalCents, cur, locale), true);
    doc.font("Helvetica");

    y += 16;
    doc.fontSize(10).fillColor("#000").text(labels.dunningDeadline(formatDate(data.newDueDate, lang)), left, y, { width: right - left });

    // Fuß: Bank + Aussteller
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
      data.seller.bankName ? `${labels.bank}: ${data.seller.bankName}` : null,
      data.seller.iban ? `${labels.iban}: ${data.seller.iban}` : null,
      data.seller.bic ? `${labels.bic}: ${data.seller.bic}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
    if (bankLine) doc.text(bankLine, left, footY + 11, { width: right - left, align: "center" });

    doc.end();
  });
}
