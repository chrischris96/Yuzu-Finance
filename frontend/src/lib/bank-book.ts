/** Deterministic educational cash-flow / booking / stress engine. No network, clocks or storage. */
export const ENGINE_VERSION = "bank-book/0.4.1";
export type Treatment = "AC" | "FVOCI" | "FVTPL" | "Unresolved";
export type Product =
  | "Bond"
  | "Deposit"
  | "IRS"
  | "Cash"
  | "CCS"
  | "CDS"
  | "CFD"
  | "Option"
  | "Other";
export type BookPosition = {
  id: string;
  name: string;
  product: Product;
  currency: string;
  side: "asset" | "liability";
  notional: number;
  openingValue: number;
  maturity: string;
  frequency: 1 | 3 | 6 | 12;
  rateType: "fixed" | "floating";
  coupon: number;
  spreadBp: number;
  fixing: number;
  creditSpreadBp: number;
  treatment: Treatment;
  sppi: "pass" | "fail" | "unassessed";
  businessModel: "collect" | "collect-sell" | "other";
  regulatoryBook: "banking" | "trading";
  depositType: "term" | "sight" | "call";
  payFixed: boolean;
  pd: number;
  lgd: number;
  stage: 1 | 2;
  creditAssessed: boolean;
};
export type Adjustment = {
  id: string;
  date: string;
  account: string;
  type: "Asset" | "Liability" | "Equity" | "Income" | "Expense";
  amount: number;
  description: string;
  riskDisposition: "unmapped" | "non-risk";
  rationale: string;
};
export type Book = {
  schemaVersion: 1;
  id: string;
  name: string;
  asOf: string;
  currency: "EUR";
  capital: number;
  source: string;
  positions: BookPosition[];
  adjustments: Adjustment[];
};
export type Curve = {
  asOf: string;
  source: string;
  nodes: { years: number; rate: number }[];
};
export type Flow = {
  date: string;
  interest: number;
  principal: number;
  label: string;
};
export type Model = {
  schemaVersion: 1;
  id: string;
  name: string;
  version: string;
  owner: string;
  purpose: string;
  limitations: string;
  status: "draft" | "reviewed";
  reviewer: string;
  reviewNotes: string;
  source: string;
  kind: "cashflow-dcf" | "imported-cashflows";
  compounding: "continuous" | "annual";
  parameters: {
    parallelBp: number;
    shortBp: number;
    longBp: number;
    spreadBp: number;
    depositBeta: number;
    depositLifeMonths: number;
    runoffPct: number;
    pdMultiplier: number;
  };
  external?: {
    snapshotHash: string;
    curve: Curve;
    positions: { id: string; baseline: Flow[]; stress: Flow[] }[];
  };
  limits: { eveLoss: number; niiLoss: number; minimumCash: number };
};
export type Inputs = {
  book: Book;
  curve: Curve;
  model: Model;
  horizonMonths: number;
  snapshotHash: string;
};
export type Posting = {
  date: string;
  event: string;
  positionId: string;
  account: string;
  type: Adjustment["type"];
  amount: number;
};
export type Point = {
  date: string;
  pv: number;
  carrying: number;
  gross: number;
  accrued: number;
  interest: number;
  interestCash: number;
  principalCash: number;
  ecl: number;
  pnl: number;
  oci: number;
};
export const cents = (v: number) =>
  Math.round((v + Number.EPSILON) * 100) / 100 || 0;
const DAY = 86400000;
export function validDate(s: unknown): s is string {
  return (
    typeof s === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    Number.isFinite(Date.parse(s)) &&
    new Date(s).toISOString().slice(0, 10) === s
  );
}
export const years = (a: string, b: string) =>
  (Date.parse(b) - Date.parse(a)) / DAY / 365;
export function addMonths(date: string, months: number) {
  const d = new Date(date + "T00:00:00Z"),
    day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
  ).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString().slice(0, 10);
}
export const canonical = (value: unknown): string => {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  const obj = value as Record<string, unknown>;
  return (
    "{" +
    Object.keys(obj)
      .sort()
      .map((k) => JSON.stringify(k) + ":" + canonical(obj[k]))
      .join(",") +
    "}"
  );
};
export async function fingerprint(value: unknown): Promise<string> {
  const data = new TextEncoder().encode(canonical(value));
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
}
function fail(message: string): never {
  throw Error(message);
}
function finite(v: unknown, min: number, max: number, label: string) {
  if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max)
    fail(label + " outside supported range");
}
function text(v: unknown, label: string, max = 500) {
  if (typeof v !== "string" || !v.trim() || v.length > max)
    fail(label + " is required / too long");
}
function one(v: unknown, list: unknown[], label: string) {
  if (!list.includes(v)) fail("Invalid " + label);
}
export function validateInputs(input: Inputs) {
  const { book: b, curve: c, model: m } = input;
  if (!b || !c || !m) fail("Book, curve and model are required");
  if (b.schemaVersion !== 1 || m.schemaVersion !== 1)
    fail("Unsupported schema version");
  text(b.id, "Book ID");
  text(b.name, "Book name");
  text(b.source, "Book source");
  if (!validDate(b.asOf) || b.asOf < "2000-01-01" || b.asOf > "2100-01-01")
    fail("Invalid valuation date");
  one(b.currency, ["EUR"], "reporting currency");
  finite(b.capital, 0, 1e12, "Capital");
  if (
    !Array.isArray(b.positions) ||
    b.positions.length > 250 ||
    !Array.isArray(b.adjustments) ||
    b.adjustments.length > 1000
  )
    fail("Book limits exceeded");
  finite(input.horizonMonths, 1, 60, "Horizon");
  if (!Number.isInteger(input.horizonMonths))
    fail("Horizon must be whole months");
  const ids = new Set<string>();
  for (const p of b.positions) {
    text(p.id, "Position ID", 100);
    text(p.name, "Position name", 100);
    if (ids.has(p.id)) fail("Duplicate position ID");
    ids.add(p.id);
    one(
      p.product,
      [
        "Bond",
        "Deposit",
        "IRS",
        "Cash",
        "CCS",
        "CDS",
        "CFD",
        "Option",
        "Other",
      ],
      "product",
    );
    one(p.side, ["asset", "liability"], "side");
    text(p.currency, "Currency", 3);
    if (
      !validDate(p.maturity) ||
      p.maturity <= b.asOf ||
      years(b.asOf, p.maturity) > 50
    )
      fail(p.id + ": maturity must be within 50 years and after snapshot");
    one(p.frequency, [1, 3, 6, 12], "frequency");
    one(p.rateType, ["fixed", "floating"], "rate type");
    one(p.treatment, ["AC", "FVOCI", "FVTPL", "Unresolved"], "treatment");
    one(p.regulatoryBook, ["banking", "trading"], "regulatory book");
    one(p.sppi, ["pass", "fail", "unassessed"], "SPPI");
    one(
      p.businessModel,
      ["collect", "collect-sell", "other"],
      "business model",
    );
    one(p.depositType, ["term", "sight", "call"], "deposit type");
    one(p.stage, [1, 2], "credit stage");
    if (
      typeof p.payFixed !== "boolean" ||
      typeof p.creditAssessed !== "boolean"
    )
      fail("Invalid boolean setting");
    finite(p.notional, 0.01, 1e11, "Notional");
    finite(p.openingValue, -1e11, 1e11, "Opening value");
    finite(p.coupon, -0.2, 1, "Coupon");
    finite(p.fixing, -0.2, 1, "Fixing");
    finite(p.spreadBp, -2000, 10000, "Coupon spread");
    finite(p.creditSpreadBp, 0, 10000, "Credit spread");
    finite(p.pd, 0, 0.999, "Annual PD");
    finite(p.lgd, 0, 1, "LGD");
    if (["Bond", "Deposit", "Cash"].includes(p.product) && p.openingValue <= 0)
      fail("Debt/cash opening value must be positive");
    if (
      p.product === "Cash" &&
      (p.side !== "asset" ||
        p.openingValue !== p.notional ||
        p.treatment !== "AC")
    )
      fail("Cash must be an AC asset at face value");
    if (
      (p.product === "IRS" ||
        ["CCS", "CDS", "CFD", "Option"].includes(p.product)) &&
      !["FVTPL", "Unresolved"].includes(p.treatment)
    )
      fail("Standalone derivatives must be FVTPL");
    if (
      p.side === "liability" &&
      ["Bond", "Deposit"].includes(p.product) &&
      !["AC", "Unresolved"].includes(p.treatment)
    )
      fail("Only ordinary AC funding is supported");
    if (
      p.side === "asset" &&
      ["Bond", "Deposit"].includes(p.product) &&
      ["AC", "FVOCI"].includes(p.treatment) &&
      (p.sppi !== "pass" ||
        p.businessModel !== (p.treatment === "AC" ? "collect" : "collect-sell"))
    )
      fail(p.id + ": SPPI / business model contradicts treatment");
    if (
      p.rateType === "floating" &&
      ["Bond", "Deposit"].includes(p.product) &&
      p.openingValue !== p.notional
    )
      fail("Floating debt currently requires par opening consideration");
    if (
      p.product === "Deposit" &&
      p.depositType !== "term" &&
      (p.frequency !== 1 || p.openingValue !== p.notional)
    )
      fail(
        "Behavioural deposits require monthly payments and par opening consideration",
      );
  }
  const adjIds = new Set<string>(),
    daily = new Map<string, number>();
  for (const a of b.adjustments) {
    text(a.id, "Adjustment ID");
    if (adjIds.has(a.id)) fail("Duplicate adjustment ID");
    adjIds.add(a.id);
    if (
      !validDate(a.date) ||
      a.date < b.asOf ||
      a.date > addMonths(b.asOf, input.horizonMonths)
    )
      fail("Adjustment date outside run horizon");
    text(a.account, "Adjustment account");
    text(a.description, "Adjustment description");
    one(
      a.type,
      ["Asset", "Liability", "Equity", "Income", "Expense"],
      "account type",
    );
    one(a.riskDisposition, ["unmapped", "non-risk"], "risk disposition");
    if (a.riskDisposition === "non-risk")
      text(a.rationale, "Non-risk rationale");
    finite(a.amount, -1e11, 1e11, "Adjustment amount");
    if (Math.abs(a.amount - cents(a.amount)) > 1e-7)
      fail("Adjustments require cents");
    daily.set(a.date, cents((daily.get(a.date) || 0) + a.amount));
  }
  for (const [date, sum] of daily)
    if (sum !== 0) fail("Unbalanced adjustments on " + date);
  if (c.asOf !== b.asOf) fail("Curve and portfolio valuation dates must match");
  text(c.source, "Curve source");
  if (!Array.isArray(c.nodes) || c.nodes.length < 2 || c.nodes.length > 100)
    fail("Curve requires 2–100 nodes");
  c.nodes.forEach((n, k) => {
    finite(n.years, 0, 60, "Curve tenor");
    finite(n.rate, -0.2, 1, "Zero rate");
    if (k && n.years <= c.nodes[k - 1].years)
      fail("Curve tenors must strictly increase");
  });
  if (c.nodes[0].years !== 0) fail("Curve must begin at tenor zero");
  for (const k of [
    "id",
    "name",
    "version",
    "owner",
    "purpose",
    "limitations",
    "source",
  ] as const)
    text(m[k], "Model " + k, 2000);
  one(m.status, ["draft", "reviewed"], "review status");
  if (m.status === "reviewed") {
    text(m.reviewer, "Reviewer");
    text(m.reviewNotes, "Review evidence");
    if (m.reviewer === m.owner) fail("Reviewer must differ from model owner");
  }
  one(m.kind, ["cashflow-dcf", "imported-cashflows"], "model kind");
  one(m.compounding, ["continuous", "annual"], "compounding");
  if (!m.parameters || !m.limits) fail("Model parameters / limits missing");
  for (const k of ["parallelBp", "shortBp", "longBp", "spreadBp"] as const)
    finite(m.parameters[k], -1000, 1000, k);
  finite(m.parameters.depositBeta, 0, 2, "Deposit beta");
  finite(m.parameters.depositLifeMonths, 1, 120, "Behavioural life");
  if (!Number.isInteger(m.parameters.depositLifeMonths))
    fail("Behavioural life must be whole months");
  finite(m.parameters.runoffPct, 0, 1, "Runoff");
  finite(m.parameters.pdMultiplier, 0, 20, "PD multiplier");
  finite(m.limits.eveLoss, 0, 1e12, "EVE limit");
  finite(m.limits.niiLoss, 0, 1e12, "NII limit");
  finite(m.limits.minimumCash, -1e12, 1e12, "Cash limit");
  const maxYears = Math.max(
    years(b.asOf, addMonths(b.asOf, input.horizonMonths)),
    ...b.positions
      .filter((p) => p.product !== "Cash")
      .map((p) =>
        years(
          b.asOf,
          p.product === "Deposit" && p.depositType !== "term"
            ? addMonths(b.asOf, m.parameters.depositLifeMonths)
            : p.maturity,
        ),
      ),
  );
  if (c.nodes.at(-1)!.years < maxYears)
    fail("Curve does not cover the complete cash-flow / behavioural horizon");
  if (m.kind === "imported-cashflows") {
    if (!m.external || m.external.snapshotHash !== input.snapshotHash)
      fail("Imported model belongs to a different portfolio snapshot");
    if (canonical(m.external.curve) !== canonical(c))
      fail("Imported model belongs to a different market curve");
    if (
      !Array.isArray(m.external.positions) ||
      m.external.positions.length > 250
    )
      fail("Invalid external position list");
    const seen = new Set<string>();
    for (const p of m.external.positions) {
      if (!ids.has(p.id) || seen.has(p.id))
        fail("Unknown / duplicate imported position");
      seen.add(p.id);
      for (const name of ["baseline", "stress"] as const) {
        if (!Array.isArray(p[name]) || p[name].length > 1200)
          fail("Invalid imported cash-flow schedule");
        let prev = b.asOf;
        for (const f of p[name]) {
          if (
            !validDate(f.date) ||
            f.date <= b.asOf ||
            f.date < prev ||
            years(b.asOf, f.date) > c.nodes.at(-1)!.years
          )
            fail(
              "Imported cash-flow dates must be future, ordered and curve-covered",
            );
          prev = f.date;
          finite(f.interest, -1e11, 1e11, "Imported interest");
          finite(f.principal, -1e11, 1e11, "Imported principal");
          text(f.label, "Cash-flow label", 150);
        }
      }
    }
    for (const external of m.external.positions) {
      const p = b.positions.find((p) => p.id === external.id)!;
      if (p.product === "Cash")
        fail(
          "Cash is face value and cannot be overridden by imported cash flows",
        );
      for (const path of [external.baseline, external.stress]) {
        if (!path.length)
          fail("Empty imported schedule is missing coverage, not zero risk");
        if (
          ["Bond", "Deposit"].includes(p.product) &&
          Math.abs(
            path.reduce((s, f) => s + f.principal, 0) -
              (p.side === "asset" ? 1 : -1) * p.notional,
          ) > 0.005
        )
          fail("Imported debt principal does not reconcile to the contract");
        if (p.product === "IRS" && path.some((f) => f.principal !== 0))
          fail("IRS notional is not a principal cash flow");
      }
      if (
        (p.product === "Bond" ||
          (p.product === "Deposit" && p.depositType === "term")) &&
        p.rateType === "fixed" &&
        canonical(external.baseline) !== canonical(external.stress)
      )
        fail(
          "Fixed debt cash flows cannot change under this valuation-only stress interface; credit defaults / contract modifications require a separate model",
        );
      if (
        p.product === "Bond" ||
        (p.product === "Deposit" && p.depositType === "term")
      )
        for (const path of [external.baseline, external.stress])
          if (
            path.some(
              (f) =>
                f.date > p.maturity ||
                (f.principal !== 0 && f.date !== p.maturity),
            )
          )
            fail("Imported bullet debt must redeem at contractual maturity");
    }
  }
}
export function zeroRate(curve: Curve, t: number) {
  const ns = curve.nodes;
  if (t <= 0) return ns[0].rate;
  for (let k = 1; k < ns.length; k++)
    if (t <= ns[k].years) {
      const a = ns[k - 1],
        b = ns[k];
      return a.rate + ((b.rate - a.rate) * (t - a.years)) / (b.years - a.years);
    }
  return fail("Curve extrapolation is not permitted");
}
export function shockBp(m: Model, t: number) {
  const p = m.parameters;
  return (
    p.parallelBp +
    p.shortBp * Math.exp(-t / 2) +
    p.longBp * (1 - Math.exp(-t / 2))
  );
}
export function discount(
  c: Curve,
  m: Model,
  date: string,
  stress: boolean,
  spread = 0,
) {
  const t = years(c.asOf, date),
    r = zeroRate(c, t) + (stress ? shockBp(m, t) / 10000 : 0) + spread / 10000;
  if (1 + r <= 0) fail("Invalid discount rate");
  return m.compounding === "continuous"
    ? Math.exp(-r * t)
    : Math.pow(1 + r, -t);
}
export function schedule(asOf: string, maturity: string, frequency: number) {
  const dates: string[] = [];
  for (let n = frequency; n <= 600; n += frequency) {
    const d = addMonths(asOf, n);
    dates.push(d < maturity ? d : maturity);
    if (d >= maturity) return dates;
  }
  return fail("Schedule exceeds supported horizon");
}
function coverage(p: BookPosition, m: Model): string | null {
  if (p.currency !== "EUR") return "Currency translation is not modelled";
  if (
    m.kind === "imported-cashflows" &&
    m.external?.positions.some((e) => e.id === p.id)
  )
    return null;
  if (["Bond", "Deposit", "IRS", "Cash"].includes(p.product)) return null;
  return p.product + " requires imported baseline and stressed cash flows";
}
export function cashflows(
  p: BookPosition,
  b: Book,
  c: Curve,
  m: Model,
  stress: boolean,
): Flow[] {
  // Monetary settlements are EUR cents. Do not persist platform-specific
  // sub-cent transcendental noise in the calculation evidence.
  return rawCashflows(p, b, c, m, stress).map((f) => ({
    ...f,
    interest: cents(f.interest),
    principal: cents(f.principal),
  }));
}
function rawCashflows(
  p: BookPosition,
  b: Book,
  c: Curve,
  m: Model,
  stress: boolean,
): Flow[] {
  const external =
    m.kind === "imported-cashflows"
      ? m.external?.positions.find((e) => e.id === p.id)
      : undefined;
  if (external)
    return structuredClone(stress ? external.stress : external.baseline);
  if (coverage(p, m)) return [];
  if (p.product === "Cash") return [];
  const sign = p.side === "liability" ? -1 : 1,
    nmd = p.product === "Deposit" && p.depositType !== "term";
  const maturity = nmd
    ? addMonths(b.asOf, m.parameters.depositLifeMonths)
    : p.maturity;
  const dates = schedule(b.asOf, maturity, p.frequency);
  const flows: Flow[] = [];
  let prev = b.asOf;
  const runoff = stress && nmd ? m.parameters.runoffPct : 0;
  const withdrawnPrincipal = cents(p.notional * runoff);
  const runoffDate = addMonths(b.asOf, 1);
  const discountAt = (d: string) => discount(c, m, d, stress);
  for (const date of dates) {
    const yf = years(prev, date);
    const fwd =
      prev === b.asOf
        ? p.fixing
        : (discountAt(prev) / discountAt(date) - 1) / yf;
    if (p.product === "IRS")
      flows.push({
        date,
        interest:
          p.notional *
          yf *
          (fwd + p.spreadBp / 10000 - p.coupon) *
          (p.payFixed ? 1 : -1),
        principal: 0,
        label: "IRS net fixed / floating settlement",
      });
    else {
      const baselineFwd =
        prev === b.asOf
          ? p.fixing
          : (discount(c, m, prev, false) / discount(c, m, date, false) - 1) /
            yf;
      const rate = nmd
        ? p.coupon +
          (stress ? m.parameters.depositBeta * (fwd - baselineFwd) : 0)
        : p.rateType === "fixed"
          ? p.coupon
          : fwd + p.spreadBp / 10000;
      // Runoff occurs after one month, including only the contractual interest earned before withdrawal.
      const exposureYears =
        years(prev, date) -
        runoff *
          Math.max(0, years(prev > runoffDate ? prev : runoffDate, date));
      flows.push({
        date,
        interest: sign * p.notional * rate * exposureYears,
        principal:
          date === maturity
            ? sign * (cents(p.notional) - withdrawnPrincipal)
            : 0,
        label: nmd
          ? "Behavioural deposit cash flow"
          : "Contractual debt cash flow",
      });
    }
    prev = date;
  }
  if (runoff)
    flows.push({
      date: runoffDate,
      interest: 0,
      principal: sign * withdrawnPrincipal,
      label: "Assumed deposit withdrawal",
    });
  return flows.sort((a, b) => a.date.localeCompare(b.date));
}
export function presentValue(
  flows: Flow[],
  c: Curve,
  m: Model,
  date: string,
  stress: boolean,
  spread = 0,
) {
  const denom = discount(c, m, date, stress, spread);
  return flows
    .filter((f) => f.date > date)
    .reduce(
      (s, f) =>
        s +
        ((f.interest + f.principal) * discount(c, m, f.date, stress, spread)) /
          denom,
      0,
    );
}
function cumulativeInterest(flows: Flow[], asOf: string, date: string) {
  let prior = asOf,
    total = 0;
  for (const f of flows) {
    if (f.interest === 0) continue;
    const fraction =
      date >= f.date
        ? 1
        : date <= prior
          ? 0
          : years(prior, date) / years(prior, f.date);
    total += f.interest * fraction;
    prior = f.date;
  }
  return total;
}
function effectiveYield(flows: Flow[], asOf: string, cost: number) {
  const sign = flows.reduce((s, f) => s + f.principal, 0) < 0 ? -1 : 1;
  const positive = flows.map((f) => ({
    ...f,
    interest: sign * f.interest,
    principal: sign * f.principal,
  }));
  let lo = -2,
    hi = 2;
  const pv = (r: number) =>
    positive.reduce(
      (s, f) =>
        s + (f.interest + f.principal) * Math.exp(-r * years(asOf, f.date)),
      0,
    );
  while (pv(hi) > cost && hi < 100) hi *= 2;
  while (pv(lo) < cost && lo > -100) lo *= 2;
  if (!(pv(lo) >= cost && pv(hi) <= cost))
    fail(
      "Cash flows and opening value do not bracket a supported effective yield",
    );
  for (let n = 0; n < 100; n++) {
    const mid = (lo + hi) / 2;
    if (pv(mid) > cost) lo = mid;
    else hi = mid;
  }
  const rate = (lo + hi) / 2;
  if (!Number.isFinite(pv(rate)) || Math.abs(pv(rate) - cost) > 0.001)
    fail("Effective yield does not reconcile to opening value");
  return rate;
}
function allowance(
  p: BookPosition,
  b: Book,
  c: Curve,
  m: Model,
  date: string,
  stress: boolean,
  flows: Flow[],
) {
  if (
    !p.creditAssessed ||
    p.side === "liability" ||
    !["Bond", "Deposit"].includes(p.product) ||
    !["AC", "FVOCI"].includes(p.treatment)
  )
    return 0;
  const maturity = flows.at(-1)?.date ?? p.maturity,
    remaining = Math.max(0, years(date, maturity));
  const horizon = p.stage === 1 ? Math.min(1, remaining) : remaining,
    pd = Math.min(0.999, p.pd * (stress ? m.parameters.pdMultiplier : 1));
  const survival = Math.pow(1 - pd, horizon),
    repaid = flows
      .filter((f) => f.date <= date)
      .reduce((s, f) => s + f.principal, 0);
  const exposure = Math.max(0, p.notional - repaid);
  // Transparent proxy, not a calibrated IFRS 9 ECL model: marginal horizon PD × LGD × remaining principal, midpoint-discounted.
  const t = years(b.asOf, date) + horizon / 2,
    rate = zeroRate(c, t) + (stress ? shockBp(m, t) / 10000 : 0);
  return cents(
    exposure * p.lgd * (1 - survival) * Math.exp((-rate * horizon) / 2),
  );
}
function point(
  p: BookPosition,
  input: Inputs,
  date: string,
  stress: boolean,
  flows: Flow[],
  eir: number,
): Point {
  const { book: b, curve: c, model: m } = input,
    derivative = !["Bond", "Deposit", "Cash"].includes(p.product),
    sign = p.side === "liability" ? -1 : 1;
  const initial = derivative ? p.openingValue : sign * p.openingValue;
  const paid = flows.filter((f) => f.date <= date),
    interestCash = cents(paid.reduce((s, f) => s + f.interest, 0)),
    principalCash = cents(paid.reduce((s, f) => s + f.principal, 0));
  const contractual = cumulativeInterest(flows, b.asOf, date),
    accrued = cents(contractual - interestCash);
  let interest = contractual;
  if (
    (p.product === "Bond" ||
      (p.product === "Deposit" && p.depositType === "term")) &&
    p.rateType === "fixed"
  ) {
    const t = years(b.asOf, date),
      end = flows.at(-1)?.date ?? p.maturity;
    const effectiveDate = date > end ? end : date;
    const grossAtEnd =
      initial * Math.exp(eir * years(b.asOf, effectiveDate)) -
      paid
        .filter((f) => f.date <= effectiveDate)
        .reduce(
          (s, f) =>
            s +
            (f.interest + f.principal) *
              Math.exp(eir * years(f.date, effectiveDate)),
          0,
        );
    interest =
      date >= end
        ? interestCash + principalCash - initial
        : grossAtEnd - initial + interestCash + principalCash;
    if (!Number.isFinite(t)) fail("Invalid projection date");
  }
  interest = cents(interest);
  const gross = cents(initial + interest - interestCash - principalCash);
  const spread = p.creditSpreadBp + (stress ? m.parameters.spreadBp : 0);
  const pv =
    p.product === "Cash"
      ? initial
      : cents(presentValue(flows, c, m, date, stress, spread));
  const ecl = allowance(p, b, c, m, date, stress, flows);
  const fvMove = cents(pv - gross);
  const carrying =
    p.treatment === "AC"
      ? cents(gross - ecl)
      : p.treatment === "Unresolved"
        ? initial
        : pv;
  const pnl =
    p.treatment === "Unresolved"
      ? 0
      : cents(interest - ecl + (p.treatment === "FVTPL" ? fvMove : 0));
  const oci = p.treatment === "FVOCI" ? cents(fvMove + ecl) : 0;
  return {
    date,
    pv,
    carrying,
    gross,
    accrued,
    interest: cents(interest),
    interestCash: cents(interestCash),
    principalCash: cents(principalCash),
    ecl,
    pnl,
    oci,
  };
}
export function runStress(input: Inputs) {
  validateInputs(input);
  const { book: b, curve: c, model: m } = input;
  const dates = Array.from({ length: input.horizonMonths + 1 }, (_, n) =>
    addMonths(b.asOf, n),
  );
  const positions = b.positions.map((p) => {
    const missing = coverage(p, m),
      baseFlows = cashflows(p, b, c, m, false),
      stressFlows = cashflows(p, b, c, m, true);
    const eir =
      (p.product === "Bond" ||
        (p.product === "Deposit" && p.depositType === "term")) &&
      p.rateType === "fixed" &&
      !missing
        ? effectiveYield(baseFlows, b.asOf, p.openingValue)
        : 0;
    const baseline = missing
        ? null
        : dates.map((d) => point(p, input, d, false, baseFlows, eir)),
      stressed = missing
        ? null
        : dates.map((d) => point(p, input, d, true, stressFlows, eir));
    const needsCredit =
      p.side === "asset" &&
      ["Bond", "Deposit"].includes(p.product) &&
      ["AC", "FVOCI"].includes(p.treatment);
    return {
      id: p.id,
      name: p.name,
      product: p.product,
      regulatoryBook: p.regulatoryBook,
      treatment: p.treatment,
      notional: p.notional,
      missing,
      creditMissing: needsCredit && !p.creditAssessed,
      baseline,
      stressed,
      baseFlows,
      stressFlows,
    };
  });
  const journal = (stress: boolean) => {
    const postings: Posting[] = [];
    const pair = (
      date: string,
      event: string,
      id: string,
      account: string,
      type: Posting["type"],
      other: string,
      otherType: Posting["type"],
      amount: number,
    ) => {
      amount = cents(amount);
      if (amount === 0) return;
      postings.push(
        { date, event, positionId: id, account, type, amount },
        {
          date,
          event,
          positionId: id,
          account: other,
          type: otherType,
          amount: -amount,
        },
      );
    };
    pair(
      b.asOf,
      "Opening capital",
      "BANK",
      "1000 · Settlement cash",
      "Asset",
      "3000 · Paid-in capital",
      "Equity",
      b.capital,
    );
    for (const p of b.positions) {
      const r = positions.find((r) => r.id === p.id)!,
        path = stress ? r.stressed : r.baseline,
        derivative = !["Bond", "Deposit", "Cash"].includes(p.product),
        initial = derivative
          ? p.openingValue
          : (p.side === "asset" ? 1 : -1) * p.openingValue;
      const account = "Position · " + p.name + " [" + p.id + "]";
      const type =
        p.side === "liability" && !derivative ? "Liability" : "Asset";
      pair(
        b.asOf,
        "Initial recognition",
        p.id,
        account,
        type,
        "1000 · Settlement cash",
        "Asset",
        initial,
      );
      if (!path || p.treatment === "Unresolved") continue;
      for (let k = 0; k < path.length; k++) {
        const now = path[k],
          prev = k ? path[k - 1] : null;
        const delta = (key: keyof Point) =>
          cents(Number(now[key]) - Number(prev?.[key] ?? 0));
        pair(
          now.date,
          "Effective / contractual interest",
          p.id,
          account,
          type,
          p.side === "liability" && !derivative
            ? "5000 · Interest expense"
            : "4000 · Interest income",
          p.side === "liability" && !derivative ? "Expense" : "Income",
          delta("interest"),
        );
        pair(
          now.date,
          "Interest payment",
          p.id,
          "1000 · Settlement cash",
          "Asset",
          account,
          type,
          delta("interestCash"),
        );
        pair(
          now.date,
          "Principal payment",
          p.id,
          "1000 · Settlement cash",
          "Asset",
          account,
          type,
          delta("principalCash"),
        );
        pair(
          now.date,
          "Accrued interest presentation",
          p.id,
          "Accrued interest · " + p.name + " [" + p.id + "]",
          type,
          account,
          type,
          delta("accrued"),
        );
        if (p.treatment !== "AC")
          pair(
            now.date,
            "Fair value remeasurement",
            p.id,
            account,
            type,
            p.treatment === "FVOCI"
              ? "3100 · FVOCI reserve"
              : "4100 · Fair value result",
            p.treatment === "FVOCI" ? "Equity" : "Income",
            cents(now.pv - now.gross - (prev ? prev.pv - prev.gross : 0)),
          );
        pair(
          now.date,
          "ECL proxy / reversal",
          p.id,
          "5100 · Expected credit loss expense",
          "Expense",
          p.treatment === "FVOCI"
            ? "3100 · FVOCI reserve"
            : "Loss allowance · " + p.name + " [" + p.id + "]",
          p.treatment === "FVOCI" ? "Equity" : "Asset",
          delta("ecl"),
        );
      }
    }
    for (const a of b.adjustments)
      postings.push({
        date: a.date,
        event: a.description,
        positionId: "ADJUSTMENT:" + a.id,
        account: "Adjustment · " + a.account,
        type: a.type,
        amount: a.amount,
      });
    return postings;
  };
  const baselineJournal = journal(false),
    stressJournal = journal(true);
  const ledger = (postings: Posting[], date: string) => {
    const map = new Map<
      string,
      { account: string; type: Posting["type"]; balance: number }
    >();
    for (const p of postings.filter((p) => p.date <= date)) {
      const key = p.type + "|" + p.account,
        r = map.get(key) ?? { account: p.account, type: p.type, balance: 0 };
      r.balance = cents(r.balance + p.amount);
      map.set(key, r);
    }
    const rows = [...map.values()].filter((r) => r.balance !== 0);
    for (const row of rows)
      if (
        row.type === "Asset" &&
        row.balance < 0 &&
        !row.account.startsWith("Loss allowance")
      )
        row.type = "Liability";
    const sum = (type: Posting["type"]) =>
      cents(
        rows.filter((r) => r.type === type).reduce((s, r) => s + r.balance, 0),
      );
    const assets = sum("Asset"),
      liabilities = -sum("Liability"),
      pnl = cents(-sum("Income") - sum("Expense")),
      equity = cents(-sum("Equity") + pnl),
      cash =
        rows.find((r) => r.account === "1000 · Settlement cash")?.balance ?? 0;
    return {
      date,
      rows,
      assets,
      liabilities,
      equity,
      pnl,
      cash,
      difference: cents(assets - liabilities - equity),
    };
  };
  const statements = dates.map((date) => ({
    date,
    baseline: ledger(baselineJournal, date),
    stress: ledger(stressJournal, date),
  }));
  const banking = positions.filter((p) => p.regulatoryBook === "banking"),
    uncovered = banking.filter((p) => p.missing),
    unmapped = b.adjustments.filter((a) => a.riskDisposition === "unmapped");
  const coveredEveDelta = cents(
    banking.reduce(
      (s, p) =>
        s +
        (p.stressed && p.baseline ? p.stressed[0].pv - p.baseline[0].pv : 0),
      0,
    ),
  );
  const baselineNii = cents(
      banking.reduce((s, p) => s + (p.baseline?.at(-1)?.interest ?? 0), 0),
    ),
    stressNii = cents(
      banking.reduce((s, p) => s + (p.stressed?.at(-1)?.interest ?? 0), 0),
    );
  const missingAccounting = positions.filter(
      (p) => p.missing || p.treatment === "Unresolved",
    ),
    creditMissing = positions.filter((p) => p.creditMissing);
  const complete = uncovered.length === 0 && unmapped.length === 0;
  const cashMin = Math.min(...statements.map((s) => s.stress.cash));
  const eveDelta = complete ? coveredEveDelta : null,
    niiDelta = complete && cashMin >= 0 ? cents(stressNii - baselineNii) : null;
  const reconciliation = dates.map((date, k) => {
    const reconcile = (stress: boolean) => {
      const statement = stress ? statements[k].stress : statements[k].baseline;
      const values = positions.reduce((s, r) => {
        const p = b.positions.find((p) => p.id === r.id)!;
        const initial = !["Bond", "Deposit", "Cash"].includes(p.product)
          ? p.openingValue
          : (p.side === "asset" ? 1 : -1) * p.openingValue;
        return (
          s + ((stress ? r.stressed : r.baseline)?.[k]?.carrying ?? initial)
        );
      }, 0);
      const adjustments = b.adjustments
        .filter(
          (a) => a.date <= date && ["Asset", "Liability"].includes(a.type),
        )
        .reduce((s, a) => s + a.amount, 0);
      return cents(
        statement.assets -
          statement.liabilities -
          statement.cash -
          values -
          adjustments,
      );
    };
    return { date, baseline: reconcile(false), stress: reconcile(true) };
  });
  const issues = [
    ...positions.filter((p) => p.missing).map((p) => p.id + ": " + p.missing),
    ...positions
      .filter((p) => p.treatment === "Unresolved")
      .map(
        (p) =>
          p.id +
          ": accounting unresolved; risk still evaluated where supported",
      ),
    ...creditMissing.map((p) => p.id + ": credit loss not assessed"),
    ...unmapped.map(
      (a) => "Adjustment " + a.id + ": no risk mapping / exclusion rationale",
    ),
    ...(cashMin < 0
      ? [
          "Projected cash deficit: additional funding and its interest cost are NOT modelled",
        ]
      : []),
    ...(m.status === "draft"
      ? ["Model is draft, without recorded independent review"]
      : []),
  ];
  if (
    statements.some(
      (s) => s.baseline.difference !== 0 || s.stress.difference !== 0,
    ) ||
    reconciliation.some((r) => r.baseline !== 0 || r.stress !== 0)
  )
    fail("Internal reconciliation failed; no publishable result was produced");
  return {
    engineVersion: ENGINE_VERSION,
    dates,
    positions,
    baselineJournal,
    stressJournal,
    statements,
    reconciliation,
    issues,
    coverage: {
      bankingPositions: banking.length,
      covered: banking.length - uncovered.length,
      uncovered: uncovered.map((p) => p.id),
      unmappedAdjustments: unmapped.map((a) => a.id),
      accountingComplete: missingAccounting.length === 0,
      creditComplete: creditMissing.length === 0,
    },
    metrics: {
      eveDelta,
      niiDelta,
      coveredEveDelta,
      coveredBaselineNii: baselineNii,
      coveredStressNii: stressNii,
      minimumProjectedCash: missingAccounting.length ? null : cashMin,
    },
    limits: {
      eve:
        eveDelta === null
          ? "not-assessed"
          : -eveDelta > m.limits.eveLoss
            ? "breach"
            : "within-limit",
      nii:
        niiDelta === null
          ? "not-assessed"
          : -niiDelta > m.limits.niiLoss
            ? "breach"
            : "within-limit",
      cash: missingAccounting.length
        ? "not-assessed"
        : cashMin < m.limits.minimumCash
          ? "breach"
          : "within-limit",
    },
    assumptions: [
      "EUR only; ACT/365 fixed; dates clamped to month end, without business-day adjustment",
      "Static run-off balance sheet; no new business; settlement cash earns zero",
      "EVE covers banking positions only; economic equity excludes own-equity discounting and is not CET1",
      "Full remaining contractual / behavioural cash flows for EVE; chosen horizon for cumulative interest / NII",
      "Instantaneous zero-curve shocks persist through projection; single curve for projection and discounting",
      "Deposit beta / life / runoff are assumptions, not calibrated historical estimates",
      "Simple PD × LGD × principal ECL proxy with midpoint discounting; no Stage 3, defaults or calibrated IFRS 9 ECL",
      "Imported cash flows are provider assumptions; structural validation is not independent economic validation",
      "Generated journal is monthly aggregated movements; cash-flow trace retains contractual payment dates",
    ],
  };
}
export function sampleBook(): Book {
  const base: BookPosition = {
    id: "bond",
    name: "Fixed treasury bond",
    product: "Bond",
    currency: "EUR",
    side: "asset",
    notional: 1000000,
    openingValue: 1000000,
    maturity: "2031-01-01",
    frequency: 6,
    rateType: "fixed",
    coupon: 0.03,
    spreadBp: 0,
    fixing: 0.03,
    creditSpreadBp: 0,
    treatment: "AC",
    sppi: "pass",
    businessModel: "collect",
    regulatoryBook: "banking",
    depositType: "term",
    payFixed: true,
    pd: 0.005,
    lgd: 0.45,
    stage: 1,
    creditAssessed: true,
  };
  return {
    schemaVersion: 1,
    id: "example-bank",
    name: "Treasury example bank",
    asOf: "2026-01-01",
    currency: "EUR",
    capital: 5000000,
    source: "Fictional worked example; no provider data",
    positions: [
      base,
      {
        ...base,
        id: "liquidity-bond",
        name: "Liquidity bond · FVOCI",
        notional: 500000,
        openingValue: 500000,
        treatment: "FVOCI",
        businessModel: "collect-sell",
        maturity: "2029-01-01",
      },
      {
        ...base,
        id: "floating-bond",
        name: "Floating-rate note",
        notional: 300000,
        openingValue: 300000,
        rateType: "floating",
        frequency: 3,
        maturity: "2028-01-01",
      },
      {
        ...base,
        id: "sight-deposits",
        name: "Customer sight deposits",
        product: "Deposit",
        side: "liability",
        notional: 1500000,
        openingValue: 1500000,
        coupon: 0.01,
        depositType: "sight",
        frequency: 1,
        creditAssessed: false,
      },
      {
        ...base,
        id: "irs",
        name: "Pay-fixed / receive-floating IRS",
        product: "IRS",
        notional: 1000000,
        openingValue: 0,
        treatment: "FVTPL",
        sppi: "unassessed",
        businessModel: "other",
        frequency: 6,
        creditAssessed: false,
      },
      {
        ...base,
        id: "cash",
        name: "Vault cash",
        product: "Cash",
        notional: 50000,
        openingValue: 50000,
        coupon: 0,
        creditAssessed: false,
      },
    ],
    adjustments: [],
  };
}
export function sampleCurve(): Curve {
  return {
    asOf: "2026-01-01",
    source: "Illustrative continuous zero curve; not market quotes",
    nodes: [
      { years: 0, rate: 0.025 },
      { years: 1, rate: 0.027 },
      { years: 5, rate: 0.03 },
      { years: 10, rate: 0.032 },
      { years: 51, rate: 0.034 },
    ],
  };
}
export function sampleModel(): Model {
  return {
    schemaVersion: 1,
    id: "parallel-up",
    name: "Rates rise +200 bp",
    version: "1.0",
    owner: "Demo author",
    purpose:
      "Assess banking-book economic value, earnings and funding sensitivity",
    limitations: "Illustrative shock; not a prescribed supervisory calibration",
    status: "draft",
    reviewer: "",
    reviewNotes: "",
    source: "User-defined educational scenario",
    kind: "cashflow-dcf",
    compounding: "continuous",
    parameters: {
      parallelBp: 200,
      shortBp: 0,
      longBp: 0,
      spreadBp: 0,
      depositBeta: 0.5,
      depositLifeMonths: 36,
      runoffPct: 0,
      pdMultiplier: 1,
    },
    limits: { eveLoss: 100000, niiLoss: 20000, minimumCash: 0 },
  };
}
export type RunOutput = ReturnType<typeof runStress>;
export type RunRecord = {
  schemaVersion: 1;
  id: string;
  createdAt: string;
  inputHash: string;
  resultHash: string;
  inputs: Inputs;
  result: RunOutput;
};
export async function createRun(
  book: Book,
  curve: Curve,
  model: Model,
  horizonMonths: number,
): Promise<RunRecord> {
  const snapshotHash = await fingerprint(book),
    inputs = structuredClone({
      book,
      curve,
      model,
      horizonMonths,
      snapshotHash,
    }),
    result = runStress(inputs),
    inputHash = await fingerprint({ engineVersion: ENGINE_VERSION, inputs }),
    resultHash = await fingerprint(result);
  return {
    schemaVersion: 1,
    id: inputHash,
    createdAt: new Date().toISOString(),
    inputHash,
    resultHash,
    inputs,
    result,
  };
}
export async function verifyRun(record: RunRecord) {
  if (
    record.schemaVersion !== 1 ||
    record.result.engineVersion !== ENGINE_VERSION
  )
    fail("Run requires its original engine version");
  if ((await fingerprint(record.inputs.book)) !== record.inputs.snapshotHash)
    fail("Portfolio hash mismatch");
  const inputHash = await fingerprint({
    engineVersion: ENGINE_VERSION,
    inputs: record.inputs,
  });
  if (inputHash !== record.inputHash || record.id !== inputHash)
    fail("Input integrity check failed");
  const result = runStress(record.inputs);
  if (
    (await fingerprint(result)) !== record.resultHash ||
    (await fingerprint(record.result)) !== record.resultHash
  )
    fail("Result integrity / replay check failed");
  return result;
}
