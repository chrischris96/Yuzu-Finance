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
    r.rows.some((x) => x.account === a.ACCOUNTS.oci),
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
writeFileSync(
  ".test-build/comparison.cjs",
  ts
    .transpileModule(readFileSync("src/lib/comparison.ts", "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    })
    .outputText.replace(
      'require("./accounting")',
      'require("./accounting.cjs")',
    ),
);
const comparison = createRequire(import.meta.url)(
  "../.test-build/comparison.cjs",
);
test("Example library covers every requested product with valid unique inputs", () => {
  const examples = a.samplePortfolio();
  assert.equal(examples.length, 16);
  assert.equal(new Set(examples.map((i) => i.id)).size, examples.length);
  assert.deepEqual(
    [...new Set(examples.map((i) => i.product))].sort(),
    [...a.PRODUCTS].sort(),
  );
  examples.forEach((i) => assert.deepEqual(a.validateInstrument(i), []));
});
test("Quarterly coupon accrues before payment and clears at payment date", () => {
  const i = { ...bond, coupon: 12, paymentFrequency: 3, ecl: 0 };
  const first = a.evaluate(i, 1),
    third = a.evaluate(i, 3);
  assert.equal(first.coupons, 0);
  assert.equal(first.accrued, 1000);
  assert.equal(first.interest, a.round(100000 * (Math.pow(1.03, 1 / 3) - 1)));
  assert.equal(third.coupons, 3000);
  assert.equal(third.accrued, 0);
  assert.equal(third.carrying, 100000);
});
test("Final stub pays coupons and clears principal, accrued interest, ECL and OCI", () => {
  const i = {
    ...bond,
    paymentFrequency: 6,
    maturity: 9,
    coupon: 12,
    initial: 97000,
    businessModel: "collect-sell",
  };
  const p = a.evaluate(i, 9),
    r = a.portfolio([i], [], 9);
  assert.equal(p.coupons, 9000);
  assert.equal(p.interest, 12000);
  assert.equal(p.redemption, 100000);
  assert.equal(p.accrued, 0);
  assert.equal(p.carrying, 0);
  assert.equal(p.allowance, 0);
  assert.equal(p.fvChange, 0);
  assert.equal(r.difference, 0);
  assert.ok(!r.rows.some((row) => row.account === a.ACCOUNTS.oci));
});
test("Every generated monthly event contains equal debit and credit legs", () => {
  const r = a.portfolio(a.samplePortfolio(), [], 12);
  for (let n = 0; n < r.postings.length; n += 2) {
    const left = r.postings[n],
      right = r.postings[n + 1];
    assert.equal(left.month, right.month);
    assert.equal(left.description, right.description);
    assert.equal(left.instrument, right.instrument);
    assert.equal(a.round(left.amount + right.amount), 0);
  }
  for (let m = 0; m <= 12; m++)
    assert.equal(
      a.round(
        r.postings
          .filter((p) => p.month === m)
          .reduce((s, p) => s + p.amount, 0),
      ),
      0,
    );
});
test("Monthly history reconciles to each prior reporting snapshot", () => {
  const examples = a.samplePortfolio();
  const history = a.portfolio(examples, [], 12).postings;
  const balances = (rows) => {
    const map = new Map();
    for (const r of rows)
      map.set(r.account, a.round((map.get(r.account) || 0) + r.amount));
    return [...map]
      .filter(([, v]) => v !== 0)
      .sort((a, b) => a[0].localeCompare(b[0]));
  };
  for (let m = 0; m <= 12; m++)
    assert.deepEqual(
      balances(history.filter((p) => p.month <= m)),
      balances(a.portfolio(examples, [], m).postings),
    );
});
test("FVOCI and FVTPL have identical book and total comprehensive result on debt paths", () => {
  for (const i of a.samplePortfolio().filter(comparison.debtComparison))
    for (let m = 0; m <= 12; m++) {
      const pl = comparison.comparisonPoint(i, "FVTPL", m),
        oci = comparison.comparisonPoint(i, "FVOCI", m);
      assert.equal(pl.carrying, oci.carrying);
      assert.equal(pl.comprehensive, oci.comprehensive);
      assert.equal(oci.comprehensive, a.round(oci.pnl + oci.oci));
      assert.equal(pl.oci, 0);
      assert.equal(pl.allowance, 0);
    }
});
test("Accrued interest and loss allowance have separate consistent ledger accounts", () => {
  const i = { ...bond, paymentFrequency: 6 };
  const r = a.portfolio([i], [], 1);
  assert.ok(
    r.rows.some(
      (x) =>
        x.account.startsWith("Accrued interest receivable") && x.balance > 0,
    ),
  );
  assert.ok(
    r.rows.some(
      (x) => x.account.startsWith("Loss allowance") && x.balance === -i.ecl,
    ),
  );
  assert.ok(r.rows.some((x) => x.account === a.ACCOUNTS.interestIncome));
  const funding = a.portfolio([{ ...i, side: "liability" }], [], 1);
  assert.ok(
    funding.rows.some(
      (x) => x.account.startsWith("Accrued interest payable") && x.balance < 0,
    ),
  );
  assert.ok(
    funding.rows.some(
      (x) => x.account === a.ACCOUNTS.interestExpense && x.balance > 0,
    ),
  );
});
test("Unsupported FVOCI scenarios remain experiments and do not change classification", () => {
  for (const product of ["IRS", "CCS", "CDS", "CFD", "Option", "Cash"]) {
    const i = a.template(product),
      category = a.classify(i);
    assert.equal(comparison.available(i, "FVOCI"), false);
    comparison.series(i, "FVOCI");
    assert.equal(a.classify(i), category);
  }
});
test("Old saved instruments retain monthly payments; invalid schedules are rejected", () => {
  assert.deepEqual(
    a.evaluate(bond, 5),
    a.evaluate({ ...bond, paymentFrequency: 1 }, 5),
  );
  assert.ok(a.validateInstrument({ ...bond, paymentFrequency: 2 }).length);
});
console.log(`${count} accounting and import checks passed.`);
