import {
  AccountType,
  Instrument,
  Batch,
  portfolio,
  classify,
  rationale,
  dateAt,
} from "./accounting";
import { RunRecord, cents } from "./bank-book";

export type Entry = {
  id: string;
  date: string;
  event: string;
  source: string;
  positionId: string;
  original: string;
  type: AccountType;
  amount: number;
  group: string;
  code: string;
  label: string;
  component: string;
};
export type Detail = {
  id: string;
  name: string;
  category: string;
  rationale: string;
  maturity: string;
  repricing: string;
  source: string;
  carrying: number | null;
  fair: number | null;
  pnl: number | null;
  oci: number | null;
  eve: number | null;
  nii: number | null;
  coverage: string;
};
export type Report = {
  id: string;
  date: string;
  previous: string;
  source: string;
  entries: Entry[];
  details: Detail[];
  difference: number;
  subledgerDifference: number | null;
  issues: string[];
  risk: boolean;
};
export type Group = {
  id: string;
  name: string;
  parent: string | null;
  order: number;
};
export const groups: Group[] = [
  ["A", "Assets", null],
  ["L", "Liabilities", null],
  ["E", "Equity", null],
  ["cash", "Cash and central-bank balances", "A"],
  ["collateral", "Restricted cash collateral", "A"],
  ["banks", "Loans and advances to banks", "A"],
  ["ac", "Debt securities at amortised cost", "A"],
  ["fvoci", "Financial assets at FVOCI", "A"],
  ["fvtpl", "Financial assets at FVTPL", "A"],
  ["da", "Derivative financial assets", "A"],
  ["otherA", "Other assets · mapping review", "A"],
  ["deposits", "Customer deposits", "L"],
  ["issued", "Debt securities issued", "L"],
  ["dl", "Derivative financial liabilities", "L"],
  ["otherL", "Other funding and liabilities", "L"],
  ["capital", "Contributed equity", "E"],
  ["oci", "Accumulated other comprehensive income", "E"],
  ["profit", "Current-period profit or loss", "E"],
  ["otherE", "Other equity · mapping review", "E"],
].map(([id, name, parent], order) => ({ id: id!, name: name!, parent, order }));
export const groupName = (id: string) =>
  groups.find((g) => g.id === id)?.name ?? id;
function mapping(
  original: string,
  type: AccountType,
  p?: { product: string; side: string; category: string },
  negative = false,
) {
  let group: string;
  if (type === "Income" || type === "Expense") group = "profit";
  else if (type === "Equity")
    group = /3100|FVOCI/i.test(original)
      ? "oci"
      : /3000|capital/i.test(original)
        ? "capital"
        : "otherE";
  else if (/Restricted collateral cash/.test(original)) group = "collateral";
  else if (!p)
    group = /1000/.test(original)
      ? negative
        ? "otherL"
        : "banks"
      : type === "Liability"
        ? "otherL"
        : "otherA";
  else if (
    !["Bond", "Deposit", "Cash", "Cash at sight", "Cash at call"].includes(
      p.product,
    )
  )
    group = negative ? "dl" : "da";
  else if (p.side === "liability")
    group = p.product === "Bond" ? "issued" : "deposits";
  else if (p.product === "Cash") group = "cash";
  else if (p.category === "FVTPL") group = "fvtpl";
  else if (p.category === "FVOCI") group = "fvoci";
  else group = p.product === "Bond" ? "ac" : "banks";
  const component = /allowance/i.test(original)
    ? "Loss allowance"
    : /Accrued/i.test(original)
      ? "Accrued interest"
      : type === "Income" || type === "Expense"
        ? /interest/i.test(original)
          ? type === "Income"
            ? "Interest income"
            : "Interest expense"
          : /credit loss/i.test(original)
            ? "Credit impairment expense"
            : /fair value|FVTPL/i.test(original)
              ? "Net gains or losses at FVTPL"
              : /4200/.test(original)
                ? "Realised disposal result"
                : /5200/.test(original)
                  ? "Execution costs"
                  : original
        : group === "oci"
          ? "FVOCI reserve"
          : group === "capital"
            ? "Paid-in capital"
            : /1000/.test(original)
              ? "Settlement account"
              : group === "collateral"
                ? "Restricted collateral cash"
                : "Principal and valuation";
  const custom =
    !p &&
    !/1000|3000|3100|4000|4100|4200|5000|5100|5200|Restricted collateral cash/.test(
      original,
    );
  const code = custom
    ? "CUSTOM:" + type + ":" + original
    : `${group}.${component.toLowerCase().replace(/[^a-z]+/g, "-")}`;
  return { group, code, label: custom ? original : component, component };
}
export function legacyReport(
  instruments: Instrument[],
  batches: Batch[],
  month: number,
): Report {
  const r = portfolio(instruments, batches, month),
    date = dateAt(month),
    previous = month ? dateAt(month - 1) : "2025-12-31";
  // Preserve exact imported dates; legacy snapshot postings otherwise stamp all imports with the current month.
  const entries: Entry[] = r.instrumentPostings.map((p, k) => {
    const matches = instruments.filter((i) => i.name === p.instrument);
    const id =
      p.account.match(/\[([^\]]+)\]$/)?.[1] ??
      (matches.length === 1 ? matches[0].id : "");
    const i = /\[[^\]]+\]$/.test(p.account)
      ? instruments.find((i) => i.id === id)
      : undefined;
    const row = r.rows.find((x) => x.account === p.account);
    return {
      id: "generated:" + k,
      date: dateAt(p.month),
      event: p.description,
      source: "Deterministic instrument demo",
      positionId: id,
      original: p.account,
      type: p.type,
      amount: p.amount,
      ...mapping(
        p.account,
        p.type,
        i
          ? { product: i.product, side: i.side, category: classify(i) }
          : undefined,
        !!row && row.balance < 0 && !/allowance/i.test(p.account),
      ),
    };
  });
  for (const b of batches)
    for (const [k, e] of b.entries.entries())
      if (e.entry_date <= date)
        entries.push({
          id: b.id + ":" + k,
          date: e.entry_date,
          event: e.description,
          source: b.name,
          positionId: "",
          original: e.account_code + " · " + e.account_name,
          type: e.account_type,
          amount: cents(e.debit - e.credit),
          ...mapping(e.account_code + " · " + e.account_name, e.account_type),
        });
  return {
    id: "Editable instrument demo",
    date,
    previous,
    source: "Browser workspace · sample or manually entered inputs",
    entries,
    difference: r.difference,
    subledgerDifference: null,
    risk: false,
    issues: r.positions
      .filter((p) => p.category === "Review required")
      .map(
        (p) =>
          p.instrument.name +
          ": excluded until accounting classification is resolved",
      ),
    details: r.positions.map((p) => ({
      id: p.instrument.id,
      name: p.instrument.name,
      category: p.category,
      rationale: `${rationale(p.instrument)} Business model: ${p.instrument.businessModel}; SPPI: ${p.instrument.sppi}; assessment: ${p.instrument.assessment}. Stage ${p.instrument.stage}; entered ECL ${p.instrument.ecl}.`,
      maturity: dateAt(p.instrument.maturity),
      repricing: `${p.instrument.coupon}% contractual coupon; payment every ${p.instrument.paymentFrequency ?? 1} month(s)`,
      source:
        p.instrument.marketMode === "sample"
          ? "Fictional prefilled prices"
          : "User-entered prices",
      carrying: p.category === "Review required" ? null : p.carrying,
      fair: p.category === "Review required" ? null : p.market,
      pnl:
        instruments.filter((i) => i.name === p.instrument.name).length !== 1
          ? null
          : r.instrumentPostings
              .filter(
                (e) =>
                  e.instrument === p.instrument.name &&
                  ["Income", "Expense"].includes(e.type),
              )
              .reduce((s, e) => s - e.amount, 0),
      oci:
        instruments.filter((i) => i.name === p.instrument.name).length !== 1
          ? null
          : r.instrumentPostings
              .filter(
                (e) =>
                  e.instrument === p.instrument.name &&
                  e.account.includes("3100"),
              )
              .reduce((s, e) => s - e.amount, 0),
      eve: null,
      nii: null,
      coverage: "Risk not modelled in this demo; use a saved stress run",
    })),
  };
}
export function runReport(
  run: RunRecord,
  month: number,
  view: "baseline" | "stress",
): Report {
  const r = run.result,
    b = run.inputs.book,
    date = r.dates[month],
    previous = month
      ? r.dates[month - 1]
      : new Date(Date.parse(b.asOf) - 86400000).toISOString().slice(0, 10);
  const journal = view === "stress" ? r.stressJournal : r.baselineJournal;
  const statement = r.statements[month][view];
  const entries = journal
    .filter((p) => p.date <= date)
    .map((p, k) => {
      const positionAccount =
        /^(Position|Accrued interest|Loss allowance) · /.test(p.account);
      const pos = positionAccount
        ? b.positions.find((x) => x.id === p.positionId)
        : undefined;
      const row = statement.rows.find((x) => x.account === p.account);
      return {
        id: view + ":" + k,
        date: p.date,
        event: p.event,
        source: b.source,
        positionId: b.positions.some((x) => x.id === p.positionId)
          ? p.positionId
          : "",
        original: p.account,
        type: p.type,
        amount: p.amount,
        ...mapping(
          p.account,
          p.type,
          pos
            ? { product: pos.product, side: pos.side, category: pos.treatment }
            : undefined,
          !!row && row.balance < 0 && !/allowance/i.test(p.account),
        ),
      };
    });
  return {
    id: run.id,
    date,
    previous,
    source: `${b.source} · ${run.inputs.curve.source} · ${run.inputs.model.name} ${run.inputs.model.version}`,
    entries,
    difference: statement.difference,
    subledgerDifference: r.reconciliation[month][view],
    issues: r.issues,
    risk: true,
    details: b.positions.map((p) => {
      const q = r.positions.find((q) => q.id === p.id)!,
        point = (view === "stress" ? q.stressed : q.baseline)?.[month];
      const covered =
        !!q.baseline && !!q.stressed && p.regulatoryBook === "banking";
      return {
        id: p.id,
        name: p.name,
        category: p.treatment,
        rationale: `Business model: ${p.businessModel}; SPPI: ${p.sppi}. ${p.side === "asset" && ["AC", "FVOCI"].includes(p.treatment) ? `Stage ${p.stage}; PD ${p.pd}; LGD ${p.lgd}; ${p.creditAssessed ? "assessed" : "unassessed"} educational ECL proxy.` : "Separate ECL allowance not applicable to this treatment."}`,
        maturity: p.maturity,
        repricing: `${p.rateType}; coupon ${p.coupon * 100}%; fixing ${p.fixing * 100}%; payment every ${p.frequency} months; ${p.product === "Deposit" ? p.depositType + " deposit" : ""}`,
        source: b.source,
        carrying: point?.carrying ?? null,
        fair: point?.pv ?? null,
        pnl: point?.pnl ?? null,
        oci: point?.oci ?? null,
        eve: covered ? cents(q.stressed![0].pv - q.baseline![0].pv) : null,
        nii: covered
          ? cents(q.stressed!.at(-1)!.interest - q.baseline!.at(-1)!.interest)
          : null,
        coverage:
          q.missing ||
          (p.regulatoryBook === "trading"
            ? "Outside banking-book EVE/NII"
            : q.creditMissing
              ? "Rate risk modelled; credit inputs missing"
              : "Banking risk modelled"),
      };
    }),
  };
}
export type Totals = {
  opening: number;
  debit: number;
  credit: number;
  closing: number;
  transactions: number;
  accruals: number;
  valuation: number;
  impairment: number;
  other: number;
  difference: number;
};
export function totals(entries: Entry[], previous: string): Totals {
  const out: Totals = {
    opening: 0,
    debit: 0,
    credit: 0,
    closing: 0,
    transactions: 0,
    accruals: 0,
    valuation: 0,
    impairment: 0,
    other: 0,
    difference: 0,
  };
  for (const p of entries) {
    out.closing += p.amount;
    if (p.date <= previous) {
      out.opening += p.amount;
      continue;
    }
    out.debit += Math.max(0, p.amount);
    out.credit += Math.max(0, -p.amount);
    const key = /ECL|credit loss/i.test(p.event)
      ? "impairment"
      : /fair value/i.test(p.event)
        ? "valuation"
        : /interest.*(accru|presentation)|Effective \/ contractual interest/i.test(
              p.event,
            )
          ? "accruals"
          : /recognition|capital|payment|paid|received|redeemed/i.test(p.event)
            ? "transactions"
            : "other";
    out[key] += p.amount;
  }
  for (const key of Object.keys(out) as (keyof Totals)[])
    out[key] = cents(out[key]);
  out.difference = cents(
    out.closing -
      out.opening -
      out.transactions -
      out.accruals -
      out.valuation -
      out.impairment -
      out.other,
  );
  return out;
}
export function validateLayout(
  layout: Group[],
  assignments: Record<string, string> = {},
) {
  if (!Array.isArray(layout) || layout.length > 150)
    throw Error("Layout must contain at most 150 groups.");
  const ids = new Set(layout.map((g) => g.id));
  if (ids.size !== layout.length) throw Error("Duplicate group ID.");
  for (const id of ["A", "L", "E"])
    if (!layout.some((g) => g.id === id && g.parent === null))
      throw Error("Keep the three statement roots.");
  for (const g of layout) {
    if (
      !g.id ||
      !g.name?.trim() ||
      g.name.length > 100 ||
      !Number.isFinite(g.order)
    )
      throw Error("Invalid group.");
    let parent = g.parent;
    const seen = new Set([g.id]);
    while (parent) {
      if (seen.has(parent)) throw Error("A group cannot contain itself.");
      seen.add(parent);
      const p = layout.find((x) => x.id === parent);
      if (!p) throw Error("Missing parent group.");
      parent = p.parent;
    }
    if (g.parent === null && !["A", "L", "E"].includes(g.id))
      throw Error("Groups must belong to a statement root.");
  }
  if (Object.values(assignments).some((id) => !ids.has(id)))
    throw Error("Account assigned to a missing group.");
}
export function descendants(layout: Group[], id: string): string[] {
  return [
    id,
    ...layout
      .filter((g) => g.parent === id)
      .flatMap((g) => descendants(layout, g.id)),
  ];
}
