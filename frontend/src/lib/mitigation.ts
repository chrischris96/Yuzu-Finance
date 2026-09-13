import {
  BookPosition,
  RunRecord,
  createRun,
  cents,
  addMonths,
  sampleBook,
  cashflows,
  presentValue,
  verifyRun,
  canonical,
  fingerprint,
} from "./bank-book";
export type Action = {
  kind: "funding" | "swap" | "sale";
  positionId: string;
  amount: number;
  pricePct: number;
  coupon: number;
  months: number;
  costs: number;
  collateral: number;
  executionDate: string;
  rationale: string;
};
export type Proposal = {
  version: 1;
  parent: RunRecord;
  child: RunRecord;
  action: Action;
  id: string;
};
export async function propose(
  parent: RunRecord,
  action: Action,
): Promise<Proposal> {
  await verifyRun(parent);
  if (parent.inputs.model.kind !== "cashflow-dcf")
    throw Error(
      "Imported cash-flow models need new provider cash flows for the changed book. Use the built-in model for this mitigation.",
    );
  if (action.executionDate !== parent.inputs.book.asOf)
    throw Error(
      "Actions execute at the opening valuation date. Later execution is not supported by this static run-off model.",
    );
  for (const v of [
    action.amount,
    action.pricePct,
    action.coupon,
    action.months,
    action.costs,
    action.collateral,
  ])
    if (!Number.isFinite(v)) throw Error("Enter finite action parameters.");
  if (
    action.amount <= 0 ||
    action.amount > 1e10 ||
    action.costs < 0 ||
    action.costs > 1e9 ||
    action.collateral < 0 ||
    action.collateral > 1e9 ||
    action.coupon < 0 ||
    action.coupon > 1 ||
    !Number.isInteger(action.months) ||
    action.months < 1 ||
    action.months > 360 ||
    action.pricePct <= 0 ||
    action.pricePct > 200
  )
    throw Error("Action parameters outside supported range.");
  if (!action.rationale.trim() || action.rationale.length > 120)
    throw Error(
      "Record the risk objective and feasibility in 1–120 characters.",
    );
  const b = structuredClone(parent.inputs.book),
    { curve, model, horizonMonths } = parent.inputs;
  const actionId = (await fingerprint({ parent: parent.id, action })).slice(
    0,
    20,
  );
  let gain = 0;
  if (action.kind === "sale") {
    const p = b.positions.find((p) => p.id === action.positionId);
    if (
      !p ||
      p.product !== "Bond" ||
      p.side !== "asset" ||
      p.treatment === "Unresolved"
    )
      throw Error("Select a classified asset bond.");
    if (action.amount > p.notional)
      throw Error("Sale exceeds available notional.");
    const fraction = action.amount / p.notional,
      removed = cents(p.openingValue * fraction),
      proceeds = cents((action.amount * action.pricePct) / 100);
    gain = cents(proceeds - removed);
    p.notional = cents(p.notional - action.amount);
    p.openingValue = cents(p.openingValue - removed);
    if (p.notional === 0)
      b.positions = b.positions.filter((x) => x.id !== p.id);
  } else {
    const p: BookPosition = {
      ...sampleBook().positions[0],
      id: "mitigation-" + actionId,
      name:
        action.kind === "swap"
          ? "Mitigation · pay-fixed IRS"
          : "Mitigation · term funding",
      product: action.kind === "swap" ? "IRS" : "Deposit",
      side: action.kind === "swap" ? "asset" : "liability",
      notional: action.amount,
      openingValue: action.kind === "swap" ? 0 : action.amount,
      maturity: addMonths(b.asOf, action.months),
      frequency: 1,
      coupon: action.coupon,
      fixing: curve.nodes[0].rate,
      rateType: action.kind === "swap" ? "floating" : "fixed",
      treatment: action.kind === "swap" ? "FVTPL" : "AC",
      sppi: action.kind === "swap" ? "fail" : "pass",
      businessModel: action.kind === "swap" ? "other" : "collect",
      regulatoryBook: "banking",
      depositType: "term",
      payFixed: true,
      spreadBp: 0,
      creditSpreadBp: 0,
      pd: 0,
      lgd: 0,
      creditAssessed: true,
    };
    // Off-market swaps require their initial value to be settled, not a free day-one gain.
    if (action.kind === "swap")
      p.openingValue = cents(
        presentValue(
          cashflows(p, b, curve, model, false),
          curve,
          model,
          b.asOf,
          false,
        ),
      );
    b.positions.push(p);
  }
  // An opening-date pro-forma book: capital injection is used by the unchanged engine to establish
  // settlement cash. Offset it in equity and P&L so the action does not manufacture shareholder capital.
  const bridge = cents(gain - action.costs - action.collateral);
  b.capital = cents(b.capital + bridge);
  if (b.capital < 0)
    throw Error("Action exceeds the supported opening cash/capital bridge.");
  const add = (
    suffix: string,
    type: "Asset" | "Equity" | "Income" | "Expense",
    amount: number,
    account: string,
  ) => {
    if (amount)
      b.adjustments.push({
        id: actionId + suffix,
        date: b.asOf,
        account,
        type,
        amount,
        description: "Opening-date mitigation · " + suffix,
        riskDisposition: "non-risk",
        rationale:
          "Opening-date pro-forma bridge; instrument and funding risk is represented in positions. Collateral is restricted cash with no modelled yield.",
      });
  };
  add("capital-bridge", "Equity", bridge, "3000 · Paid-in capital");
  add("sale-result", "Income", -gain, "4200 · Realised disposal result");
  add("execution-cost", "Expense", action.costs, "5200 · Execution costs");
  add("collateral", "Asset", action.collateral, "Restricted collateral cash");
  b.id = b.id + "-" + actionId;
  b.name = b.name + " · mitigation";
  b.source = `Parent ${parent.id}; opening-date pro-forma action ${canonical(action)}`;
  const child = await createRun(b, curve, model, horizonMonths);
  const proposal: Proposal = {
    version: 1,
    parent: structuredClone(parent),
    child,
    action: structuredClone(action),
    id: await fingerprint({ parent: parent.id, child: child.id, action }),
  };
  return proposal;
}
export function postingChanges(p: Proposal) {
  const key = (x: { account: string; type: string; positionId: string }) =>
    [x.type, x.account, x.positionId].join("|");
  const rows = new Map<
    string,
    { account: string; type: string; positionId: string; amount: number }
  >();
  for (const [r, sign] of [
    [p.parent, -1],
    [p.child, 1],
  ] as const)
    for (const x of r.result.baselineJournal.filter(
      (x) => x.date === r.inputs.book.asOf,
    )) {
      const k = key(x),
        v = rows.get(k) ?? {
          account: x.account,
          type: x.type,
          positionId: x.positionId,
          amount: 0,
        };
      v.amount = cents(v.amount + sign * x.amount);
      rows.set(k, v);
    }
  return [...rows.values()].filter((x) => x.amount !== 0);
}
