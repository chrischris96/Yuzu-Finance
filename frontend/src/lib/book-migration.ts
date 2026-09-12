import { Book, BookPosition, sampleBook, addMonths } from "./bank-book";
import {
  Instrument,
  Batch,
  classify,
  validateInstrument,
  validateJournal,
} from "./accounting";
/** Explicit draft conversion. Never modifies the legacy workspace or guesses credit-model calibration. */
export function migrateLegacy(raw: string): Book {
  const old = JSON.parse(raw) as {
    version: number;
    instruments: Instrument[];
    batches: Batch[];
  };
  if (
    old.version !== 1 ||
    !Array.isArray(old.instruments) ||
    !Array.isArray(old.batches) ||
    old.instruments.length > 250
  )
    throw Error("Unsupported legacy workspace");
  const template = sampleBook().positions[0],
    asOf = "2026-01-01";
  const positions = old.instruments.map((i) => {
    if (validateInstrument(i).length)
      throw Error("Invalid legacy instrument " + i.id);
    const c = classify(i),
      deposit = i.product === "Cash at sight" || i.product === "Cash at call";
    return {
      ...template,
      id: i.id,
      name: i.name,
      product: deposit ? "Deposit" : (i.product as BookPosition["product"]),
      side: i.side,
      notional: i.notional,
      openingValue: i.initial,
      maturity: addMonths(asOf, i.maturity),
      frequency: deposit
        ? 1
        : ((i.paymentFrequency ?? 1) as BookPosition["frequency"]),
      coupon: i.coupon / 100,
      fixing: i.coupon / 100,
      depositType:
        i.product === "Cash at sight"
          ? "sight"
          : i.product === "Cash at call"
            ? "call"
            : "term",
      treatment:
        c === "Amortised cost"
          ? "AC"
          : c === "Review required"
            ? "Unresolved"
            : c,
      businessModel: i.businessModel === "trading" ? "other" : i.businessModel,
      sppi:
        c === "Amortised cost" || c === "FVOCI"
          ? "pass"
          : i.sppi === "review"
            ? "unassessed"
            : i.sppi,
      pd: 0,
      creditAssessed: false,
      stage: Number(i.stage),
    } as BookPosition;
  });
  const adjustments = old.batches.flatMap((b) => {
    if (validateJournal(b.entries).length)
      throw Error("Invalid legacy batch " + b.name);
    return b.entries.map((e, k) => ({
      id: b.id + "-" + k,
      date: e.entry_date,
      account: e.account_code + " · " + e.account_name,
      type: e.account_type,
      amount: e.debit - e.credit,
      description: b.name + " · " + e.description,
      riskDisposition: "unmapped" as const,
      rationale: "",
    }));
  });
  return {
    schemaVersion: 1,
    id: "legacy-draft",
    name: "Imported demo portfolio · review required",
    asOf,
    currency: "EUR",
    capital: 5000000,
    source:
      "Converted from yuzu-bank-demo-v1. Review regulatory book, IRS direction/fixings, deposit behaviour, day-count differences and credit inputs; previous fixed ECL was not calibrated into PD/LGD.",
    positions,
    adjustments,
  };
}
