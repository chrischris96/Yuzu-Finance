import ts from "typescript";
import fs from "node:fs";
import { createRequire } from "node:module";
import assert from "node:assert/strict";
fs.mkdirSync(".report-build", { recursive: true });
for (const name of ["accounting", "bank-book", "reporting", "mitigation"])
  fs.writeFileSync(
    ".report-build/" + name + ".cjs",
    ts
      .transpileModule(fs.readFileSync("src/lib/" + name + ".ts", "utf8"), {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      })
      .outputText.replace(/require\("\.\/(.*?)"\)/g, 'require("./$1.cjs")'),
  );
const require = createRequire(import.meta.url),
  a = require("../.report-build/accounting.cjs"),
  b = require("../.report-build/bank-book.cjs"),
  r = require("../.report-build/reporting.cjs"),
  m = require("../.report-build/mitigation.cjs");
let count = 0;
async function test(name, fn) {
  await fn();
  console.log("PASS", name);
  count++;
}
const run = await b.createRun(
  b.sampleBook(),
  b.sampleCurve(),
  b.sampleModel(),
  12,
);
await test("Every report group and GL reconciles to the immutable posting record on all dates and both paths", () => {
  for (let month = 0; month <= 12; month++)
    for (const view of ["baseline", "stress"]) {
      const report = r.runReport(run, month, view);
      assert.equal(r.totals(report.entries, report.previous).closing, 0);
      for (const code of new Set(report.entries.map((e) => e.code)))
        assert.equal(
          r.totals(
            report.entries.filter((e) => e.code === code),
            report.previous,
          ).difference,
          0,
        );
      assert.equal(
        b.cents(
          report.entries
            .filter((e) => r.descendants(r.groups, "A").includes(e.group))
            .reduce((s, e) => s + e.amount, 0),
        ),
        run.result.statements[month][view].assets,
      );
    }
});
await test("Legacy manual postings retain their dates, opening balances and movement categories", () => {
  const batches = [
    {
      id: "manual",
      name: "Manual source",
      createdAt: "2026-01-01",
      entries: [
        {
          entry_date: "2026-02-15",
          account_code: "8888",
          account_name: "Reviewed adjustment",
          account_type: "Asset",
          debit: 70,
          credit: 0,
          description: "Manual item",
          currency: "EUR",
        },
        {
          entry_date: "2026-02-15",
          account_code: "9999",
          account_name: "Funding",
          account_type: "Equity",
          debit: 0,
          credit: 70,
          description: "Manual item",
          currency: "EUR",
        },
      ],
    },
  ];
  const report = r.legacyReport(a.samplePortfolio(), batches, 3),
    e = report.entries.filter((e) => e.id === "manual:0");
  assert.equal(e[0].date, "2026-02-15");
  assert.equal(r.totals(e, report.previous).opening, 70);
  assert.equal(r.totals(e, report.previous).debit, 0);
  assert.equal(r.totals(report.entries, report.previous).closing, 0);
});
await test("Layouts reject cycles, missing roots, duplicate IDs and orphan assignments", () => {
  r.validateLayout(r.groups);
  assert.throws(() =>
    r.validateLayout(
      r.groups.map((g) => (g.id === "ac" ? { ...g, parent: "ac" } : g)),
    ),
  );
  assert.throws(() => r.validateLayout(r.groups.slice(1)));
  assert.throws(() => r.validateLayout([...r.groups, r.groups[0]]));
  assert.throws(() => r.validateLayout(r.groups, { cash: "missing" }));
});
const action = {
  kind: "funding",
  positionId: "bond",
  amount: 100000,
  pricePct: 98,
  coupon: 0.04,
  months: 24,
  costs: 100,
  collateral: 5000,
  executionDate: run.inputs.book.asOf,
  rationale: "Test liquidity buffer with explicit funding cost",
};
await test("Term funding increases available cash net of costs and restricted collateral, without increasing shareholder capital", async () => {
  const p = await m.propose(run, action);
  assert.equal(
    b.cents(
      p.child.result.statements[0].baseline.cash -
        run.result.statements[0].baseline.cash,
    ),
    94900,
  );
  assert.equal(
    b.cents(m.postingChanges(p).reduce((s, e) => s + e.amount, 0)),
    0,
  );
  assert.equal(
    b.cents(
      p.child.result.statements[0].baseline.equity -
        run.result.statements[0].baseline.equity,
    ),
    -100,
  );
  await b.verifyRun(p.child);
});
await test("Selling a bond frees the executed proceeds and costs; retains original parent and reconciles both paths", async () => {
  const before = b.canonical(run),
    p = await m.propose(run, { ...action, kind: "sale" });
  assert.equal(
    b.cents(
      p.child.result.statements[0].baseline.cash -
        run.result.statements[0].baseline.cash,
    ),
    92900,
  );
  assert.equal(b.canonical(run), before);
  assert.ok(
    p.child.result.reconciliation.every(
      (x) => x.baseline === 0 && x.stress === 0,
    ),
  );
});
await test("Swap settles initial fair value instead of inventing a free gain", async () => {
  const p = await m.propose(run, { ...action, kind: "swap" }),
    swap = p.child.inputs.book.positions.at(-1);
  assert.equal(
    b.cents(
      p.child.result.statements[0].baseline.cash -
        run.result.statements[0].baseline.cash,
    ),
    b.cents(-swap.openingValue - action.costs - action.collateral),
  );
  assert.equal(
    b.cents(
      p.child.result.statements[0].baseline.equity -
        run.result.statements[0].baseline.equity,
    ),
    -100,
  );
});
await test("Reject overselling, NaN, non-opening execution and absent rationale", async () => {
  for (const bad of [
    { kind: "sale", amount: 1e10 },
    { amount: NaN },
    { executionDate: "2026-02-01" },
    { rationale: "" },
  ])
    await assert.rejects(() => m.propose(run, { ...action, ...bad }));
});
console.log(count + " reporting and mitigation checks passed");
