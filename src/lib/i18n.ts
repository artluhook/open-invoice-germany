/**
 * i18n für PDF-Export (Rechnung, Mahnung).
 * Unterstützt aktuell de und en.
 *
 * Locale-Mapping: de → de-DE, en → en-GB (31/12/2026 — euro-style Datum).
 */

export type PdfLanguage = "de" | "en";

export interface PdfLabels {
  // Dokumenttyp-Titel
  invoice: string;
  creditNote: string;
  correction: string;
  angebot: string;
  auftragsbestaetigung: string;
  proforma: string;

  // Nummern-Labels
  numberLabel: string;
  issueDate: string;
  deliveryDate: string;
  dueDate: string;
  vatIdRecipient: string;

  // Tabellenkopf
  colPos: string;
  colDescription: string;
  colQuantity: string;
  colUnitPrice: string;
  colTax: string;
  colNet: string;

  // Summen
  netTotal: string;
  taxSuffix: string; // "zzgl. {rate}% USt" / "VAT {rate}%"
  grossTotal: string;

  // Fußzeile
  taxNumber: string;
  vatId: string;
  bank: string;
  iban: string;
  bic: string;

  // Mahnung
  dunningLevel0Title: string;
  dunningLevel1Title: string;
  dunningLevel2Title: string;
  dunningNumber: string;
  dunningDate: string;
  dunningSalutation: string;
  dunningIntro0: (invoiceNo: string) => string;
  dunningIntro1: (invoiceNo: string) => string;
  dunningIntro2: (invoiceNo: string) => string;
  dunningOpenAmount: (invoiceNo: string, invoiceDate: string) => string;
  dunningInterest: (days: string) => string;
  dunningFlatFee: string;
  dunningLateFee: string;
  dunningTotal: string;
  dunningDeadline: (date: string) => string;
}

const de: PdfLabels = {
  invoice: "Rechnung",
  creditNote: "Gutschrift / Storno",
  correction: "Korrekturrechnung",
  angebot: "Angebot",
  auftragsbestaetigung: "Auftragsbestätigung",
  proforma: "Proforma-Rechnung",

  numberLabel: "Rechnungsnummer",
  issueDate: "Rechnungsdatum",
  deliveryDate: "Leistungsdatum",
  dueDate: "Fällig am",
  vatIdRecipient: "USt-IdNr. Empfänger",

  colPos: "Pos.",
  colDescription: "Beschreibung",
  colQuantity: "Menge",
  colUnitPrice: "Einzel",
  colTax: "USt",
  colNet: "Netto",

  netTotal: "Nettobetrag",
  taxSuffix: "zzgl. {rate}% USt",
  grossTotal: "Gesamtbetrag",

  taxNumber: "Steuernr.",
  vatId: "USt-IdNr.",
  bank: "Bank",
  iban: "IBAN",
  bic: "BIC",

  dunningLevel0Title: "Zahlungserinnerung",
  dunningLevel1Title: "1. Mahnung",
  dunningLevel2Title: "Letzte Mahnung",
  dunningNumber: "Nr.",
  dunningDate: "Datum",
  dunningSalutation: "Sehr geehrte Damen und Herren,",
  dunningIntro0: (n) =>
    `bei der Durchsicht unserer Unterlagen ist uns aufgefallen, dass die Rechnung ${n} bislang nicht ausgeglichen wurde. Vermutlich ist Ihnen dies entgangen — wir bitten höflich um Begleichung.`,
  dunningIntro1: (n) =>
    `trotz Fälligkeit ist die Rechnung ${n} bis heute nicht beglichen. Wir fordern Sie auf, den offenen Betrag zuzüglich der entstandenen Verzugskosten bis zum unten genannten Datum zu zahlen.`,
  dunningIntro2: (n) =>
    `auch nach unserer ersten Mahnung ist die Rechnung ${n} weiterhin offen. Wir setzen Ihnen letztmalig eine Frist zur Zahlung, bevor wir weitere Schritte einleiten.`,
  dunningOpenAmount: (n, d) =>
    `Rechnung ${n} vom ${d} — offener Betrag`,
  dunningInterest: (days) =>
    `Verzugszinsen (${days} Tage)`,
  dunningFlatFee: "Verzugspauschale (§ 288 Abs. 5 BGB)",
  dunningLateFee: "Mahnkosten",
  dunningTotal: "Zahlbarer Gesamtbetrag",
  dunningDeadline: (d) =>
    `Bitte überweisen Sie den Gesamtbetrag bis spätestens ${d}.`,
};

const en: PdfLabels = {
  invoice: "Invoice",
  creditNote: "Credit Note",
  correction: "Corrective Invoice",
  angebot: "Quotation",
  auftragsbestaetigung: "Order Confirmation",
  proforma: "Proforma Invoice",

  numberLabel: "Invoice Number",
  issueDate: "Invoice Date",
  deliveryDate: "Date of Supply",
  dueDate: "Due Date",
  vatIdRecipient: "VAT ID Recipient",

  colPos: "No.",
  colDescription: "Description",
  colQuantity: "Qty",
  colUnitPrice: "Unit Price",
  colTax: "VAT",
  colNet: "Net",

  netTotal: "Net Amount",
  taxSuffix: "VAT {rate}%",
  grossTotal: "Total",

  taxNumber: "Tax No.",
  vatId: "VAT ID",
  bank: "Bank",
  iban: "IBAN",
  bic: "BIC",

  dunningLevel0Title: "Payment Reminder",
  dunningLevel1Title: "First Reminder",
  dunningLevel2Title: "Final Reminder",
  dunningNumber: "Ref.",
  dunningDate: "Date",
  dunningSalutation: "Dear Sir or Madam,",
  dunningIntro0: (n) =>
    `upon reviewing our records, we noticed that invoice ${n} has not been settled yet. This may have been an oversight — we kindly request payment.`,
  dunningIntro1: (n) =>
    `despite being overdue, invoice ${n} remains unpaid. We request you to settle the outstanding amount plus incurred costs by the date stated below.`,
  dunningIntro2: (n) =>
    `even after our first reminder, invoice ${n} remains outstanding. We grant you a final deadline for payment before taking further action.`,
  dunningOpenAmount: (n, d) =>
    `Invoice ${n} dated ${d} — outstanding amount`,
  dunningInterest: (days) =>
    `Interest on arrears (${days} days)`,
  dunningFlatFee: "Flat-rate compensation (§ 288 para. 5 BGB)",
  dunningLateFee: "Reminder costs",
  dunningTotal: "Total amount payable",
  dunningDeadline: (d) =>
    `Please transfer the total amount by ${d} at the latest.`,
};

const LOCALE_MAP: Record<PdfLanguage, string> = {
  de: "de-DE",
  en: "en-GB",
};

export function getLabels(lang: string): PdfLabels {
  return lang === "en" ? en : de;
}

export function getLocale(lang: string): string {
  return LOCALE_MAP[lang as PdfLanguage] ?? "de-DE";
}

export function formatDate(date: Date | null | undefined, lang: string): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat(getLocale(lang), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

const COUNTRY_NAMES: Record<string, string> = {
  AT: "Österreich",
  CH: "Schweiz",
  FR: "Frankreich",
  IT: "Italien",
  NL: "Niederlande",
  BE: "Belgien",
  LU: "Luxemburg",
  GB: "Vereinigtes Königreich",
  US: "Vereinigte Staaten",
  ES: "Spanien",
  PT: "Portugal",
  PL: "Polen",
  CN: "China",
  TR: "Türkei",
};

const COUNTRY_NAMES_EN: Record<string, string> = {
  AT: "Austria",
  CH: "Switzerland",
  FR: "France",
  IT: "Italy",
  NL: "Netherlands",
  BE: "Belgium",
  LU: "Luxembourg",
  GB: "United Kingdom",
  US: "United States",
  ES: "Spain",
  PT: "Portugal",
  PL: "Poland",
  CN: "China",
  TR: "Türkiye",
};

export function countryName(code: string, lang: string): string {
  const names = lang === "en" ? COUNTRY_NAMES_EN : COUNTRY_NAMES;
  return names[code] ?? code;
}
