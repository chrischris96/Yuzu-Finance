import {
  Instrument,
  evaluate,
  classify,
  guidedSPPI,
  isDerivative,
  round,
} from "./accounting";
export type Measurement = "Amortised cost" | "FVTPL" | "FVOCI";
export const MONTHS = Array.from({ length: 13 }, (_, m) => m);
export function debtComparison(i: Instrument) {
  return !isDerivative(i.product) && i.product !== "Cash" && i.side === "asset";
}
export function scenarioNote(i: Instrument, category: Measurement) {
  if (classify(i) === category) return "Current book treatment";
  if (debtComparison(i)) {
    if (category === "FVTPL") return "Assumes a trading / other business model";
    const pass =
      (i.assessment === "guided" ? guidedSPPI(i.answers) : i.sppi) === "pass";
    return `${pass ? "SPPI pass supplied" : "Requires a hypothetical SPPI pass"}; assumes ${category === "FVOCI" ? "collect and sell" : "hold to collect"}`;
  }
  return "Non-IFRS routing experiment — not a permitted designation in this model";
}
export function available(i: Instrument, category: Measurement) {
  return classify(i) === category || debtComparison(i);
}
/** Parallel inception scenarios, never reclassifications of a live position. */
export function comparisonPoint(
  i: Instrument,
  category: Measurement,
  month: number,
) {
  const scenario = debtComparison(i)
    ? {
        ...i,
        sppi: "pass" as const,
        assessment: "direct" as const,
        businessModel:
          category === "Amortised cost"
            ? ("collect" as const)
            : category === "FVOCI"
              ? ("collect-sell" as const)
              : ("trading" as const),
      }
    : i;
  const p = evaluate(scenario, month);
  const gross = round(p.initial + p.interest - p.coupons - p.redemption);
  const movement = round(p.market - gross);
  // No fictitious ECL is imposed on derivatives, cash or funding in a routing experiment.
  const allowance = category !== "FVTPL" ? p.allowance : 0;
  const carrying =
    category === "Amortised cost" ? round(gross - allowance) : p.market;
  const pnl = round(
    p.interest - allowance + (category === "FVTPL" ? movement : 0),
  );
  const oci = category === "FVOCI" ? round(movement + allowance) : 0;
  return {
    month,
    carrying,
    market: p.market,
    accrued: p.accrued,
    interest: p.interest,
    coupons: p.coupons,
    redemption: p.redemption,
    allowance,
    pnl,
    oci,
    comprehensive: round(pnl + oci),
    cash: round(-p.initial + p.coupons + p.redemption),
    valuation: category === "Amortised cost" ? 0 : movement,
  };
}
export function series(i: Instrument, category: Measurement) {
  return MONTHS.map((m) => comparisonPoint(i, category, m));
}
