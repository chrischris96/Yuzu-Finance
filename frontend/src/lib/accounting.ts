/** Educational EUR snapshot engine. See /model-card for scope and sources. */
export const PRODUCTS = [
  "Bond",
  "IRS",
  "CCS",
  "CDS",
  "CFD",
  "Option",
  "Cash",
  "Cash at sight",
  "Cash at call",
] as const;
export type Product = (typeof PRODUCTS)[number];
export type Category = "Amortised cost" | "FVOCI" | "FVTPL" | "Review required";
export type AccountType =
  "Asset" | "Liability" | "Equity" | "Income" | "Expense";
export type BusinessModel = "collect" | "collect-sell" | "trading";
export type SPPI = "pass" | "fail" | "review";
export interface Instrument {
  id: string;
  name: string;
  product: Product;
  side: "asset" | "liability";
  notional: number;
  initial: number;
  terminal: number;
  coupon: number;
  maturity: number;
  /** Months between payments; old saved books retain monthly payments. */
  paymentFrequency?: number;
  businessModel: BusinessModel;
  sppi: SPPI;
  assessment: "direct" | "guided";
  answers: string[];
  marketMode: "sample" | "manual";
  ecl: number;
  stage: "1" | "2";
}
export interface JournalRow {
  entry_date: string;
  account_code: string;
  account_name: string;
  account_type: AccountType;
  debit: number;
  credit: number;
  description: string;
  currency: "EUR";
}
export interface Batch {
  id: string;
  name: string;
  createdAt: string;
  entries: JournalRow[];
}
export interface Posting {
  month: number;
  instrument: string;
  description: string;
  account: string;
  type: AccountType;
  amount: number;
}
export const OPENING_CAPITAL = 5_000_000;
export const START = "2026-01-01";
export const END = "2027-01-01";
export const isDerivative = (p: Product) =>
  ["IRS", "CCS", "CDS", "CFD", "Option"].includes(p);
export const round = (n: number) =>
  Math.round((n + Number.EPSILON) * 100) / 100 || 0;
export const money = (n: number) =>
  new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(n);
export function dateAt(month: number) {
  return new Date(Date.UTC(2026, month, 1)).toISOString().slice(0, 10);
}
export function guidedSPPI(answers: string[]): SPPI {
  if (
    answers.length !== 4 ||
    answers.some((a) => !["yes", "no", "uncertain"].includes(a))
  )
    return "review";
  // Basic lending features must be present; additional/complex features need assessment.
  if (answers[0] === "no" || answers[1] === "yes") return "fail";
  if (
    answers.some((a) => a === "uncertain") ||
    answers[2] === "yes" ||
    answers[3] === "yes"
  )
    return "review";
  return answers[0] === "yes" && answers.slice(1).every((a) => a === "no")
    ? "pass"
    : "review";
}
export function classify(i: Instrument): Category {
  if (isDerivative(i.product)) return "FVTPL";
  if (i.product === "Cash" || i.side === "liability") return "Amortised cost";
  if (i.businessModel === "trading") return "FVTPL";
  const result = i.assessment === "guided" ? guidedSPPI(i.answers) : i.sppi;
  if (result === "review") return "Review required";
  if (result === "fail") return "FVTPL";
  return i.businessModel === "collect" ? "Amortised cost" : "FVOCI";
}
export function rationale(i: Instrument): string {
  if (isDerivative(i.product))
    return "Standalone derivative: fair value through profit or loss. No hedge-accounting designation is modelled.";
  if (i.product === "Cash")
    return "EUR cash held at face value; no currency translation is required.";
  if (i.side === "liability")
    return "Ordinary issued debt / deposit funding at amortised cost. SPPI is an asset-classification test. Trading liabilities and the fair value option are outside this demo.";
  if (classify(i) === "Review required")
    return "Classification is unresolved. This instrument is excluded from the financial totals until the assessment is resolved.";
  return `${i.assessment === "guided" ? "Guided screen" : "User assessment"}: SPPI ${i.assessment === "guided" ? guidedSPPI(i.answers) : i.sppi}. Business model: ${i.businessModel === "collect" ? "hold to collect" : i.businessModel === "collect-sell" ? "collect and sell" : "trading / other"}.`;
}
export function template(product: Product = "Bond"): Instrument {
  const derivative = isDerivative(product),
    cash = product === "Cash";
  return {
    id: "",
    name: product === "Bond" ? "New bank bond" : product,
    product,
    side: "asset",
    notional: 100000,
    initial: derivative ? 0 : 100000,
    terminal: derivative ? 2500 : cash ? 100000 : 102000,
    coupon: cash || derivative ? 0 : 4,
    maturity: 24,
    businessModel: "collect",
    sppi: "pass",
    assessment: "direct",
    answers: ["yes", "no", "no", "no"],
    marketMode: "sample",
    ecl: cash || derivative ? 0 : 200,
    stage: "1",
  };
}
export function samplePortfolio(): Instrument[] {
  const example = (
    product: Product,
    id: string,
    name: string,
    overrides: Partial<Instrument> = {},
  ): Instrument => ({ ...template(product), id, name, ...overrides });
  return [
    example("Bond", "sample-bond-ac", "Treasury bond · hold to collect", {
      notional: 1000000,
      initial: 980000,
      terminal: 1020000,
      ecl: 1200,
      paymentFrequency: 6,
    }),
    example("Bond", "sample-bond-oci", "Liquidity reserve bond", {
      notional: 500000,
      initial: 500000,
      terminal: 515000,
      businessModel: "collect-sell",
      ecl: 800,
      paymentFrequency: 3,
    }),
    example("Bond", "sample-bond-trading", "Trading bond · falling market", {
      notional: 200000,
      initial: 202000,
      terminal: 190000,
      businessModel: "trading",
      paymentFrequency: 6,
    }),
    example(
      "Bond",
      "sample-bond-maturity",
      "Short bond · redemption at month 9",
      {
        notional: 100000,
        initial: 97000,
        terminal: 100000,
        maturity: 9,
        paymentFrequency: 3,
        businessModel: "collect-sell",
      },
    ),
    example("Bond", "sample-issued-bond", "Bank-issued senior bond", {
      side: "liability",
      notional: 750000,
      initial: 750000,
      terminal: 740000,
      coupon: 3,
      ecl: 0,
      paymentFrequency: 6,
    }),
    example("IRS", "sample-irs", "Interest rate swap · trading", {
      notional: 2000000,
      terminal: 35000,
    }),
    example("CCS", "sample-ccs", "Cross-currency swap · value turns negative", {
      notional: 1000000,
      initial: 12000,
      terminal: -18000,
    }),
    example("CDS", "sample-cds", "Credit default swap · protection bought", {
      notional: 1000000,
      terminal: 22000,
    }),
    example("CFD", "sample-cfd", "Contract for difference · market loss", {
      notional: 250000,
      terminal: -12000,
    }),
    example("Option", "sample-option", "Purchased option · premium paid", {
      notional: 500000,
      initial: 15000,
      terminal: 28000,
    }),
    example(
      "Option",
      "sample-written-option",
      "Written option · premium received",
      { notional: 500000, initial: -10000, terminal: -24000 },
    ),
    example("Cash", "sample-cash", "Vault cash", {
      notional: 50000,
      initial: 50000,
      terminal: 50000,
    }),
    example(
      "Cash at sight",
      "sample-sight-asset",
      "Sight deposit placed with a bank",
      {
        notional: 250000,
        initial: 250000,
        terminal: 250000,
        coupon: 2,
        ecl: 100,
      },
    ),
    example("Cash at sight", "sample-deposit", "Customer sight deposits", {
      side: "liability",
      notional: 1200000,
      initial: 1200000,
      terminal: 1200000,
      coupon: 1.5,
      ecl: 0,
    }),
    example(
      "Cash at call",
      "sample-call-asset",
      "Call deposit placed with a bank",
      {
        notional: 300000,
        initial: 300000,
        terminal: 300000,
        coupon: 3,
        ecl: 150,
        paymentFrequency: 3,
      },
    ),
    example("Cash at call", "sample-call-funding", "Customer call deposits", {
      side: "liability",
      notional: 400000,
      initial: 400000,
      terminal: 400000,
      coupon: 2,
      ecl: 0,
      paymentFrequency: 3,
    }),
  ];
}

export function validateInstrument(i: Instrument): string[] {
  const errors: string[] = [];
  if (!i.name.trim() || i.name.length > 100)
    errors.push("Enter an instrument name (up to 100 characters).");
  if (!PRODUCTS.includes(i.product)) errors.push("Choose a supported product.");
  if (
    !["asset", "liability"].includes(i.side) ||
    !["collect", "collect-sell", "trading"].includes(i.businessModel) ||
    !["pass", "fail", "review"].includes(i.sppi) ||
    !["direct", "guided"].includes(i.assessment) ||
    !["sample", "manual"].includes(i.marketMode) ||
    !["1", "2"].includes(i.stage)
  )
    errors.push("Invalid classification or market setting.");
  if (
    !Array.isArray(i.answers) ||
    i.answers.length !== 4 ||
    i.answers.some((a) => !["yes", "no", "uncertain"].includes(a))
  )
    errors.push("Complete all four SPPI questions.");
  for (const k of [
    "notional",
    "initial",
    "terminal",
    "coupon",
    "maturity",
    "ecl",
  ] as const)
    if (!Number.isFinite(i[k]) || Math.abs(i[k]) > 1e12)
      errors.push(`${k}: enter a finite amount within the demo limit.`);
  if (
    i.paymentFrequency !== undefined &&
    ![1, 3, 6, 12].includes(i.paymentFrequency)
  )
    errors.push("Choose monthly, quarterly, semiannual or annual payments.");
  if (i.notional <= 0) errors.push("Notional / principal must be positive.");
  if (i.coupon < 0 || i.coupon > 100)
    errors.push("Coupon must be between 0% and 100% in this demo.");
  if (!Number.isInteger(i.maturity) || i.maturity < 1 || i.maturity > 120)
    errors.push("Maturity must be 1–120 whole months.");
  if (isDerivative(i.product) && i.maturity <= 12)
    errors.push(
      "Derivative maturity must be beyond the 12-month horizon; settlement cash flows are not yet modelled.",
    );
  if (!isDerivative(i.product) && (i.initial <= 0 || i.terminal < 0))
    errors.push(
      "Non-derivative opening value must be positive; ending fair value cannot be negative.",
    );
  if (
    i.product === "Cash" &&
    (i.side !== "asset" ||
      i.initial !== i.notional ||
      i.terminal !== i.notional ||
      i.coupon !== 0)
  )
    errors.push("EUR cash is an asset held at face value without interest.");
  if (i.ecl < 0 || (i.ecl > i.initial && !isDerivative(i.product)))
    errors.push(
      "Loss allowance must be between zero and the opening carrying amount.",
    );
  return errors;
}
// Effective yield solves scheduled coupons (including a final stub) and redemption.
const yieldCache = new Map<string, number>();
export function monthlyYield(
  initial: number,
  face: number,
  coupon: number,
  months: number,
  frequency = 1,
): number {
  const key = [initial, face, coupon, months, frequency].join("|");
  const cached = yieldCache.get(key);
  if (cached !== undefined) return cached;
  const payment = (face * coupon) / 100 / 12;
  const pv = (r: number) => {
    let sum = 0;
    for (let m = 1; m <= months; m++)
      sum +=
        ((m % frequency === 0 || m === months
          ? payment * (m % frequency || frequency)
          : 0) +
          (m === months ? face : 0)) /
        Math.pow(1 + r, m);
    return sum;
  };
  let low = -0.99,
    high = 1;
  while (pv(high) > initial && high < 1e12) high *= 2;
  for (let n = 0; n < 180; n++) {
    const mid = (low + high) / 2;
    if (pv(mid) > initial) low = mid;
    else high = mid;
  }
  const result = (low + high) / 2;
  if (yieldCache.size > 2000) yieldCache.clear();
  yieldCache.set(key, result);
  return result;
}
export function evaluate(i: Instrument, month: number) {
  const category = classify(i),
    derivative = isDerivative(i.product),
    sign = i.side === "liability" ? -1 : 1;
  if (category === "Review required")
    return {
      category,
      carrying: 0,
      interest: 0,
      coupons: 0,
      fvChange: 0,
      allowance: 0,
      redemption: 0,
      initial: 0,
      accrued: 0,
      market: 0,
    };
  if (derivative) {
    const carrying = round(i.initial + ((i.terminal - i.initial) * month) / 12);
    return {
      category,
      carrying,
      interest: 0,
      coupons: 0,
      fvChange: round(carrying - i.initial),
      allowance: 0,
      redemption: 0,
      initial: i.initial,
      accrued: 0,
      market: carrying,
    };
  }
  const months = Math.min(month, i.maturity),
    cash = i.product === "Cash";
  const frequency = i.paymentFrequency ?? 1;
  const payment = cash ? 0 : (i.notional * i.coupon) / 100 / 12;
  const rate = cash
    ? 0
    : monthlyYield(i.initial, i.notional, i.coupon, i.maturity, frequency);
  let gross = i.initial,
    interest = 0,
    paid = 0;
  for (let m = 1; m <= months && !cash; m++) {
    const accrued = gross * rate;
    interest += accrued;
    const cashPaid =
      m % frequency === 0 || m === i.maturity
        ? payment * (m % frequency || frequency)
        : 0;
    paid += cashPaid;
    gross += accrued - cashPaid;
  }
  const matured = !cash && month >= i.maturity;
  // Adjust the final effective-interest amount for rounding so redemption clears exactly.
  if (matured) {
    interest = round(interest + i.notional - gross);
    gross = 0;
  }
  interest = round(interest);
  const coupons = round(paid),
    redemption = matured ? i.notional : 0;
  gross = round(i.initial + interest - coupons - redemption);
  const accrued = matured || cash ? 0 : round(payment * months - paid);
  const fairValue = cash
    ? i.initial
    : matured
      ? 0
      : round(i.initial + ((i.terminal - i.initial) * month) / 12 + accrued);
  const allowance =
    i.side === "asset" && !cash && !matured && category !== "FVTPL" ? i.ecl : 0;
  const fvChange = category === "Amortised cost" ? 0 : round(fairValue - gross);
  const carrying =
    category === "Amortised cost" ? round(gross - allowance) : fairValue;
  return {
    category,
    carrying: round(sign * carrying),
    interest: round(sign * interest),
    coupons: round(sign * coupons),
    fvChange: round(sign * fvChange),
    allowance,
    redemption: round(sign * redemption),
    initial: round(sign * i.initial),
    accrued: round(sign * accrued),
    market: round(sign * fairValue),
  };
}
export const ACCOUNTS = {
  cash: "1000 · Cash at bank — settlement",
  capital: "3000 · Paid-in capital",
  interestIncome: "4000 · Interest income",
  interestExpense: "5000 · Interest expense",
  fairValue: "4100 · Net gains / losses at FVTPL",
  oci: "3100 · FVOCI debt reserve",
  ecl: "5100 · Expected credit loss expense",
} as const;
export function instrumentAccount(i: Instrument): string {
  const label = isDerivative(i.product)
    ? "Derivative financial instruments"
    : i.product === "Bond"
      ? i.side === "asset"
        ? "Debt securities held"
        : "Debt securities issued"
      : i.product === "Cash"
        ? "Cash on hand"
        : i.side === "asset"
          ? "Deposits with banks"
          : "Customer deposits";
  return label + " · " + i.name + " [" + i.id + "]";
}
export function portfolio(
  instruments: Instrument[],
  batches: Batch[],
  month: number,
) {
  const postings: Posting[] = [];
  const pair = (
    instrument: string,
    description: string,
    account: string,
    type: AccountType,
    other: string,
    otherType: AccountType,
    amount: number,
    at = month,
  ) => {
    if (Math.abs(amount) < 0.005) return;
    postings.push(
      {
        month: at,
        instrument,
        description,
        account,
        type,
        amount: round(amount),
      },
      {
        month: at,
        instrument,
        description,
        account: other,
        type: otherType,
        amount: round(-amount),
      },
    );
  };
  pair(
    "Bank",
    "Opening capital",
    ACCOUNTS.cash,
    "Asset",
    ACCOUNTS.capital,
    "Equity",
    OPENING_CAPITAL,
    0,
  );
  const positions = instruments.map((i) => ({
    instrument: i,
    ...evaluate(i, month),
  }));
  for (const p of positions) {
    const i = p.instrument;
    if (p.category === "Review required") continue;
    const account = instrumentAccount(i);
    const type: AccountType = isDerivative(i.product)
      ? p.carrying < 0
        ? "Liability"
        : "Asset"
      : i.side === "liability"
        ? "Liability"
        : "Asset";
    const funding = !isDerivative(i.product) && i.side === "liability";
    const interestAccount = funding
      ? ACCOUNTS.interestExpense
      : ACCOUNTS.interestIncome;
    const accruedAccount =
      (funding ? "Accrued interest payable" : "Accrued interest receivable") +
      " · " +
      i.name +
      " [" +
      i.id +
      "]";
    const lossAccount = "Loss allowance · " + i.name + " [" + i.id + "]";
    pair(
      i.name,
      "Initial recognition",
      account,
      type,
      ACCOUNTS.cash,
      "Asset",
      p.initial,
      0,
    );
    for (let m = 0; m <= month; m++) {
      const now = evaluate(i, m);
      const prev = m ? evaluate(i, m - 1) : null;
      const delta = (
        key:
          | "interest"
          | "coupons"
          | "redemption"
          | "fvChange"
          | "allowance"
          | "accrued",
      ) => round(now[key] - (prev?.[key] ?? 0));
      pair(
        i.name,
        "Effective interest accrued",
        account,
        type,
        interestAccount,
        funding ? "Expense" : "Income",
        delta("interest"),
        m,
      );
      pair(
        i.name,
        "Contractual interest paid / received",
        ACCOUNTS.cash,
        "Asset",
        account,
        type,
        delta("coupons"),
        m,
      );
      pair(
        i.name,
        "Accrued interest presentation",
        accruedAccount,
        funding ? "Liability" : "Asset",
        account,
        type,
        delta("accrued"),
        m,
      );
      pair(
        i.name,
        "Principal redeemed",
        ACCOUNTS.cash,
        "Asset",
        account,
        type,
        delta("redemption"),
        m,
      );
      pair(
        i.name,
        "Fair value remeasurement / reserve release",
        account,
        type,
        p.category === "FVOCI" ? ACCOUNTS.oci : ACCOUNTS.fairValue,
        p.category === "FVOCI" ? "Equity" : "Income",
        delta("fvChange"),
        m,
      );
      if (p.category === "Amortised cost")
        pair(
          i.name,
          "Expected credit loss / reversal",
          ACCOUNTS.ecl,
          "Expense",
          lossAccount,
          "Asset",
          delta("allowance"),
          m,
        );
      if (p.category === "FVOCI")
        pair(
          i.name,
          "ECL in profit or loss with OCI offset",
          ACCOUNTS.ecl,
          "Expense",
          ACCOUNTS.oci,
          "Equity",
          delta("allowance"),
          m,
        );
    }
  }
  const instrumentPostings = [...postings];
  for (const b of batches)
    for (const e of b.entries)
      if (e.entry_date <= dateAt(month))
        postings.push({
          month,
          instrument: b.name,
          description: e.description,
          account: `${e.account_code} · ${e.account_name}`,
          type: e.account_type,
          amount: round(e.debit - e.credit),
        });
  const ledger = new Map<
    string,
    { account: string; type: AccountType; balance: number }
  >();
  for (const p of postings) {
    const key = p.type + "|" + p.account;
    const row = ledger.get(key) || {
      account: p.account,
      type: p.type,
      balance: 0,
    };
    row.balance = round(row.balance + p.amount);
    ledger.set(key, row);
  }
  const rows = [...ledger.values()].filter((r) => Math.abs(r.balance) > 0.005);
  // Settlement overdrafts are liabilities, not negative cash assets.
  const settlement = rows.find((r) => r.account === ACCOUNTS.cash);
  if (settlement && settlement.balance < 0) settlement.type = "Liability";
  const sum = (t: AccountType) =>
    round(rows.filter((r) => r.type === t).reduce((s, r) => s + r.balance, 0));
  const assets = sum("Asset"),
    liabilities = -sum("Liability"),
    profit = round(-sum("Income") - sum("Expense")),
    equity = round(-sum("Equity") + profit);
  return {
    positions,
    postings,
    instrumentPostings,
    rows,
    assets,
    liabilities,
    profit,
    equity,
    difference: round(assets - liabilities - equity),
  };
}
export const JOURNAL_HEADERS = [
  "entry_date",
  "account_code",
  "account_name",
  "account_type",
  "debit",
  "credit",
  "description",
  "currency",
];
export const SAMPLE_CSV =
  JOURNAL_HEADERS.join(",") +
  '\n2026-01-01,1100,Office equipment,Asset,2500,0,"Equipment, demo purchase",EUR\n2026-01-01,2100,Supplier payable,Liability,0,2500,"Equipment, demo purchase",EUR\n';
/** RFC4180 quoted commas, escaped quotes, CRLF and embedded newlines. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    field = "",
    quoted = false,
    closed = false;
  text = text.replace(/^\uFEFF/, "");
  for (let n = 0; n < text.length; n++) {
    const c = text[n];
    if (quoted) {
      if (c === '"') {
        if (text[n + 1] === '"') {
          field += '"';
          n++;
        } else {
          quoted = false;
          closed = true;
        }
      } else field += c;
      continue;
    }
    if (c === '"') {
      if (field || closed) throw new Error("Unexpected quote in CSV.");
      quoted = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
      closed = false;
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[n + 1] === "\n") n++;
      row.push(field);
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
      field = "";
      closed = false;
    } else {
      if (closed && !/\s/.test(c))
        throw new Error("Unexpected text after closing quote.");
      if (!closed) field += c;
    }
  }
  if (quoted) throw new Error("Unclosed quote in CSV.");
  row.push(field);
  if (row.some((v) => v.trim())) rows.push(row);
  return rows;
}
export function validateJournal(entries: JournalRow[]): string[] {
  const errors: string[] = [];
  const daily = new Map<string, number>();
  const accounts = new Map<string, string>();
  if (!entries.length || entries.length > 1000)
    return ["A batch must contain 1–1,000 rows."];
  entries.forEach((e, n) => {
    const prefix = `Row ${n + 1}: `;
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(e.entry_date) ||
      !Number.isFinite(Date.parse(e.entry_date)) ||
      new Date(e.entry_date).toISOString().slice(0, 10) !== e.entry_date ||
      e.entry_date < START ||
      e.entry_date > END
    )
      errors.push(prefix + "use a valid date in the 2026 scenario.");
    if (
      !e.account_code.trim() ||
      !e.account_name.trim() ||
      !e.description.trim()
    )
      errors.push(prefix + "account code, name and description are required.");
    if (
      !["Asset", "Liability", "Equity", "Income", "Expense"].includes(
        e.account_type,
      )
    )
      errors.push(prefix + "invalid account type.");
    if (e.currency !== "EUR")
      errors.push(
        prefix + "only EUR is supported; convert amounts before importing.",
      );
    if (
      !Number.isFinite(e.debit) ||
      !Number.isFinite(e.credit) ||
      e.debit < 0 ||
      e.credit < 0 ||
      e.debit > 1e12 ||
      e.credit > 1e12 ||
      e.debit > 0 === e.credit > 0
    )
      errors.push(prefix + "enter one positive debit OR credit.");
    if (
      Math.abs(e.debit - round(e.debit)) > 1e-7 ||
      Math.abs(e.credit - round(e.credit)) > 1e-7
    )
      errors.push(prefix + "amounts must have at most two decimals.");
    const signature = e.account_name + "|" + e.account_type;
    if (
      accounts.has(e.account_code) &&
      accounts.get(e.account_code) !== signature
    )
      errors.push(prefix + "account code has conflicting name or type.");
    accounts.set(e.account_code, signature);
    daily.set(
      e.entry_date,
      round((daily.get(e.entry_date) || 0) + e.debit - e.credit),
    );
  });
  for (const [date, total] of daily)
    if (Math.abs(total) > 0.005)
      errors.push(
        `${date}: debits and credits differ by ${money(total)}. Balance each posting date.`,
      );
  return errors;
}
export function journalFromCsv(text: string): JournalRow[] {
  const [headers, ...rows] = parseCsv(text);
  if (!headers) throw new Error("The CSV is empty.");
  const clean = headers.map((h) => h.trim());
  if (new Set(clean).size !== clean.length)
    throw new Error("Duplicate CSV headers.");
  for (const h of JOURNAL_HEADERS)
    if (!clean.includes(h))
      throw new Error(
        `Missing CSV column: ${h}. Download the sample for the required format.`,
      );
  const entries = rows.map((cols, n) => {
    if (cols.length !== clean.length)
      throw new Error(`Row ${n + 2}: column count does not match the header.`);
    const obj = Object.fromEntries(clean.map((h, k) => [h, cols[k].trim()]));
    return {
      ...obj,
      debit: obj.debit === "" ? 0 : Number(obj.debit),
      credit: obj.credit === "" ? 0 : Number(obj.credit),
    } as unknown as JournalRow;
  });
  const errors = validateJournal(entries);
  if (errors.length) throw new Error(errors.join("\n"));
  return entries;
}
