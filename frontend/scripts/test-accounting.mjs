import ts from "typescript";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import assert from "node:assert/strict";
mkdirSync(".test-build", { recursive: true });
writeFileSync(
  ".test-build/accounting.cjs",
  ts.transpileModule(readFileSync("src/lib/accounting.ts", "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText,
);
const a = createRequire(import.meta.url)("../.test-build/accounting.cjs");
let count = 0;
const test = (name, fn) => {
  fn();
  console.log("PASS", name);
  count++;
};
const bond = { ...a.template(), id: "bond" };
test("SPPI and business model classification", () => {
  assert.equal(a.classify(bond), "Amortised cost");
  assert.equal(a.classify({ ...bond, businessModel: "collect-sell" }), "FVOCI");
  assert.equal(a.classify({ ...bond, sppi: "fail" }), "FVTPL");
  assert.equal(a.classify({ ...bond, sppi: "review" }), "Review required");
  assert.equal(
    a.classify({ ...bond, businessModel: "trading", sppi: "review" }),
    "FVTPL",
  );
});
test("Guided SPPI refers complex or unknown terms", () => {
  assert.equal(a.guidedSPPI(["yes", "no", "no", "no"]), "pass");
  assert.equal(a.guidedSPPI(["yes", "yes", "no", "no"]), "fail");
  assert.equal(a.guidedSPPI(["yes", "no", "yes", "no"]), "review");
  assert.equal(a.guidedSPPI(["uncertain", "no", "no", "no"]), "review");
  assert.equal(a.guidedSPPI(["yes", "no", "no", "yes"]), "review");
});
test("Bank liabilities do not use SPPI asset classification", () =>
  assert.equal(
    a.classify({ ...bond, side: "liability", sppi: "fail" }),
    "Amortised cost",
  ));
test("Standalone derivatives are FVTPL", () => {
  for (const product of ["IRS", "CCS", "CDS", "CFD", "Option"])
    assert.equal(a.classify(a.template(product)), "FVTPL");
});
test("Par bond interest, coupons and allowance", () => {
  const r = a.evaluate(bond, 6);
  assert.equal(r.interest, 2000);
  assert.equal(r.coupons, 2000);
  assert.equal(r.carrying, 99800);
});
test("Discount bond yield amortises exactly through redemption", () => {
  const r = a.evaluate({ ...bond, initial: 95000, maturity: 12 }, 12);
  assert.equal(r.interest, 9000);
  assert.equal(r.redemption, 100000);
  assert.equal(r.carrying, 0);
  assert.equal(r.allowance, 0);
});
test("Premium bond total effective interest", () => {
  const r = a.evaluate({ ...bond, initial: 102000, maturity: 12 }, 12);
  assert.equal(r.interest, 2000);
  assert.equal(r.carrying, 0);
});
test("FVOCI keeps asset at FV despite ECL", () => {
  const r = a.evaluate({ ...bond, businessModel: "collect-sell" }, 12);
  assert.equal(r.carrying, 102000);
  assert.equal(r.allowance, 200);
  assert.equal(r.fvChange, 2000);
});
test("Derivative notional is not a carrying amount", () => {
  const r = a.evaluate(
    { ...a.template("IRS"), notional: 100000000, initial: 0, terminal: 5000 },
    12,
  );
  assert.equal(r.carrying, 5000);
  assert.equal(r.interest, 0);
});
test("Negative derivative fair value appears as liability", () => {
  const i = { ...a.template("CCS"), id: "ccs", initial: 1000, terminal: -3000 };
  const r = a.portfolio([i], [], 12);
  assert.equal(r.liabilities, 3000);
  assert.equal(r.profit, -4000);
  assert.equal(r.difference, 0);
});
test("Funding liabilities produce interest expense", () => {
  const i = {
    ...a.template("Cash at sight"),
    id: "funding",
    side: "liability",
    coupon: 3,
  };
  const r = a.portfolio([i], [], 12);
  assert.equal(r.liabilities, 100000);
  assert.equal(r.profit, -3000);
  assert.equal(r.difference, 0);
});
test("Unresolved instruments are excluded and do not consume cash", () => {
  const r = a.portfolio([{ ...bond, sppi: "review" }], [], 12);
  assert.equal(r.assets, a.OPENING_CAPITAL);
  assert.equal(r.positions[0].category, "Review required");
});
test("Mixed sample book balances at every reporting month", () => {
  for (let month = 0; month <= 12; month++) {
    const r = a.portfolio(a.samplePortfolio(), [], month);
    assert.equal(r.difference, 0);
    assert.equal(a.round(r.postings.reduce((s, p) => s + p.amount, 0)), 0);
  }
});
test("Maturity clears FVOCI asset and reserve", () => {
  const r = a.portfolio(
    [{ ...bond, businessModel: "collect-sell", maturity: 6 }],
    [],
    6,
  );
  assert.equal(r.positions[0].carrying, 0);
  assert.equal(
    r.rows.some((x) => x.account === "FVOCI reserve"),
    false,
  );
  assert.equal(r.difference, 0);
});
test("Cash overdraft is a liability", () => {
  const r = a.portfolio(
    [{ ...bond, initial: 6000000, notional: 6000000, ecl: 0 }],
    [],
    0,
  );
  assert.equal(r.liabilities, 1000000);
  assert.equal(r.assets, 6000000);
  assert.equal(r.difference, 0);
});
test("RFC CSV parsing handles quotes, commas and newlines", () => {
  assert.deepEqual(a.parseCsv('a,b\r\n"x,y","a""b\nc"\r\n'), [
    ["a", "b"],
    ["x,y", 'a"b\nc'],
  ]);
  assert.throws(() => a.parseCsv('a\n"bad'));
  assert.throws(() => a.parseCsv('a\n"bad"tail'));
});
test("Sample upload passes and preserves quoted description", () => {
  const e = a.journalFromCsv(a.SAMPLE_CSV);
  assert.equal(e.length, 2);
  assert.equal(e[0].description, "Equipment, demo purchase");
});
test("Unbalanced, negative and two-sided postings rejected", () => {
  const e = a.journalFromCsv(a.SAMPLE_CSV);
  assert.ok(a.validateJournal([e[0]]).length);
  assert.ok(a.validateJournal([{ ...e[0], debit: -1 }, e[1]]).length);
  assert.ok(a.validateJournal([{ ...e[0], credit: 20 }, e[1]]).length);
});
test("Date, currency, decimals and non-finite values rejected", () => {
  const e = a.journalFromCsv(a.SAMPLE_CSV);
  for (const change of [
    { entry_date: "2026-02-30" },
    { currency: "USD" },
    { debit: 2.123 },
    { debit: NaN },
  ])
    assert.ok(a.validateJournal([{ ...e[0], ...change }, e[1]]).length);
});
test("Batches must balance per date, not only overall", () => {
  const e = a.journalFromCsv(a.SAMPLE_CSV);
  assert.ok(
    a.validateJournal([e[0], { ...e[1], entry_date: "2026-02-01" }]).length,
  );
});
test("Dated journal adjustments enter the whole bank statement", () => {
  const e = a
    .journalFromCsv(a.SAMPLE_CSV)
    .map((x) => ({ ...x, entry_date: "2026-07-01" }));
  const b = [
    { id: "b", name: "adjustment", createdAt: "2026-01-01", entries: e },
  ];
  assert.equal(a.portfolio([], b, 5).assets, a.OPENING_CAPITAL);
  const r = a.portfolio([], b, 6);
  assert.equal(r.assets, a.OPENING_CAPITAL + 2500);
  assert.equal(r.liabilities, 2500);
  assert.equal(r.difference, 0);
});
test("Instrument validation prevents invalid and unsupported scenarios", () => {
  assert.deepEqual(a.validateInstrument(bond), []);
  assert.ok(a.validateInstrument({ ...bond, initial: NaN }).length);
  assert.ok(
    a.validateInstrument({ ...a.template("IRS"), maturity: 12 }).length,
  );
  assert.ok(a.validateInstrument({ ...bond, ecl: -1 }).length);
});
console.log(`${count} accounting and import checks passed.`);
