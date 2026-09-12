import { Model, sampleModel } from "./bank-book";
export const learningSetups = [
  {
    name: "Rates rise",
    color: "#214e42",
    title: "The hedge changes the story",
    description:
      "All zero rates rise by 200 bp. Deposit rates pass through half of the market change; assumed deposit life stays at three years.",
    why: "Fixed-rate bonds lose economic value when discount rates rise. The pay-fixed, receive-floating swap can gain, while the present value of deposit liabilities can fall. The net result reflects all three: a gain for the whole bank does not mean its bonds avoided losses.",
    lens: "Read economic value and earnings together. Repricing timing and hedges can make their responses differ.",
    parameters: { parallelBp: 200 },
  },
  {
    name: "Curve twist",
    color: "#8c621c",
    title: "One rate shock is not enough",
    description:
      "Short rates fall and long rates rise: −100 bp at the short end and +200 bp at the long end, smoothly shaped by maturity.",
    why: "A curve twist affects maturities differently. Long fixed-rate cash flows and near-term floating resets react to different parts of the curve, so the net result can differ from a parallel shift.",
    lens: "Explore non-parallel yield-curve changes and maturity mismatches, alongside the simple parallel case.",
    parameters: { parallelBp: 0, shortBp: -100, longBp: 200 },
  },
  {
    name: "Funding squeeze",
    color: "#a44736",
    title: "Funding pressure changes the picture",
    description:
      "Rates +200 bp; credit spreads +100 bp; deposit beta 1.5; life 12 months; 30% withdrawal after one month; PD proxy multiplier 2.",
    why: "Higher deposit pass-through raises funding costs; withdrawals consume cash. Shorter assumed deposit life also changes the baseline valuation. A positive EVE change cannot establish that the bank has adequate liquidity.",
    lens: "Challenge behavioural assumptions and consider interacting material risks. This combined scenario extends beyond pure IRRBB; cash here is not LCR.",
    parameters: {
      parallelBp: 200,
      spreadBp: 100,
      depositBeta: 1.5,
      depositLifeMonths: 12,
      runoffPct: 0.3,
      pdMultiplier: 2,
    },
  },
];
export function learningModels(): Model[] {
  return learningSetups.map((s, n) => {
    const m = sampleModel();
    return {
      ...m,
      id: `learning-${n + 1}`,
      name: s.name,
      purpose: s.title,
      source: "Illustrative Yuzu learning setup, informed by BIS risk concepts",
      parameters: { ...m.parameters, ...s.parameters },
      limitations:
        "User-defined demonstration, not the Basel supervisory calibration",
    };
  });
}
