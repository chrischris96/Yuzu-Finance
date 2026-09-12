import "./compile-book.mjs";
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const e = createRequire(import.meta.url)("../.book-build/bank-book.cjs");
let count = 0;
async function test(name, fn) {
  await fn();
  console.log("PASS", name);
  count++;
}
const input = () => ({
  book: e.sampleBook(),
  curve: e.sampleCurve(),
  model: e.sampleModel(),
  horizonMonths: 12,
  snapshotHash: "",
});
const near = (actual, expected, tolerance = 0.01) =>
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} differs from ${expected}`,
  );
const oneBond = () => {
  const i = input();
  i.book.positions = [
    {
      ...i.book.positions[0],
      notional: 100,
      openingValue: 100,
      coupon: 0,
      maturity: "2027-01-01",
      creditAssessed: false,
    },
  ];
  i.curve.nodes = [
    { years: 0, rate: 0.05 },
    { years: 51, rate: 0.05 },
  ];
  return i;
};
await test("Zero-coupon PV matches the independent continuous-discount formula", () => {
  const i = oneBond(),
    r = e.runStress(i);
  near(r.positions[0].baseline[0].pv, 100 * Math.exp(-0.05));
  near(r.positions[0].stressed[0].pv, 100 * Math.exp(-0.07));
});
await test("Annual discounting matches 100 / 1.05", () => {
  const i = oneBond();
  i.model.compounding = "annual";
  near(e.runStress(i).positions[0].baseline[0].pv, 100 / 1.05);
});
await test("Positive rate shocks reduce the value of fixed-rate assets", () => {
  const i = oneBond();
  assert.ok(e.runStress(i).metrics.eveDelta < 0);
});
await test("Accounting choice does not change economic rate exposure", () => {
  const i = oneBond(),
    a = e.runStress(i);
  i.book.positions[0].treatment = "FVOCI";
  i.book.positions[0].businessModel = "collect-sell";
  const b = e.runStress(i);
  assert.equal(a.metrics.eveDelta, b.metrics.eveDelta);
});
await test("Zero shock produces identical complete baseline and stress paths", () => {
  const i = input();
  Object.assign(i.model.parameters, {
    parallelBp: 0,
    shortBp: 0,
    longBp: 0,
    spreadBp: 0,
    runoffPct: 0,
    pdMultiplier: 1,
  });
  const r = e.runStress(i);
  assert.equal(r.metrics.eveDelta, 0);
  assert.equal(r.metrics.niiDelta, 0);
  for (const p of r.positions) assert.deepEqual(p.baseline, p.stressed);
});
await test("All statements and subledger bridges reconcile through 60 months", () => {
  const i = input();
  i.horizonMonths = 60;
  const r = e.runStress(i);
  for (const s of r.statements) {
    assert.equal(s.baseline.difference, 0);
    assert.equal(s.stress.difference, 0);
  }
  for (const s of r.reconciliation) assert.equal(s.baseline + s.stress, 0);
});
await test("Every generated event has equal debit and credit legs", () => {
  const r = e.runStress(input());
  for (const journal of [r.baselineJournal, r.stressJournal])
    for (let k = 0; k < journal.length; k += 2) {
      assert.equal(journal[k].date, journal[k + 1].date);
      assert.equal(journal[k].positionId, journal[k + 1].positionId);
      assert.equal(e.cents(journal[k].amount + journal[k + 1].amount), 0);
    }
});
await test("Unresolved accounting retains interest-rate risk exposure", () => {
  const i = oneBond();
  i.book.positions[0].treatment = "Unresolved";
  i.book.positions[0].sppi = "unassessed";
  const r = e.runStress(i);
  assert.ok(r.metrics.eveDelta < 0);
  assert.equal(r.coverage.accountingComplete, false);
});
await test("Unsupported banking products make total risk incomplete, not zero", () => {
  const i = input();
  i.book.positions.push({
    ...i.book.positions[0],
    id: "cds",
    product: "CDS",
    openingValue: 0,
    treatment: "FVTPL",
  });
  const r = e.runStress(i);
  assert.equal(r.metrics.eveDelta, null);
  assert.equal(r.metrics.niiDelta, null);
  assert.deepEqual(r.coverage.uncovered, ["cds"]);
});
await test("Unsupported trading exposure is disclosed but is outside banking EVE", () => {
  const i = input();
  i.book.positions.push({
    ...i.book.positions[0],
    id: "option",
    product: "Option",
    openingValue: 1000,
    treatment: "FVTPL",
    regulatoryBook: "trading",
  });
  const r = e.runStress(i);
  assert.notEqual(r.metrics.eveDelta, null);
  assert.equal(r.coverage.accountingComplete, false);
  assert.ok(r.issues.some((s) => s.startsWith("option:")));
});
await test("Foreign-currency exposure is explicitly uncovered", () => {
  const i = input();
  i.book.positions[0].currency = "USD";
  assert.equal(e.runStress(i).metrics.eveDelta, null);
});
await test("Unmapped balanced ledger entries block whole-book risk totals", () => {
  const i = input();
  i.book.adjustments = [
    {
      id: "a",
      date: "2026-01-01",
      account: "Equipment",
      type: "Asset",
      amount: 100,
      description: "Purchase",
      riskDisposition: "unmapped",
      rationale: "",
    },
    {
      id: "b",
      date: "2026-01-01",
      account: "Payable",
      type: "Liability",
      amount: -100,
      description: "Purchase",
      riskDisposition: "unmapped",
      rationale: "",
    },
  ];
  const r = e.runStress(i);
  assert.equal(r.metrics.eveDelta, null);
  assert.equal(r.reconciliation[0].stress, 0);
  i.book.adjustments.forEach((a) => {
    a.riskDisposition = "non-risk";
    a.rationale =
      "Non-interest-bearing office equipment purchase and supplier payable";
  });
  assert.notEqual(e.runStress(i).metrics.eveDelta, null);
});
await test("Unbalanced adjustments are rejected before calculation", () => {
  const i = input();
  i.book.adjustments = [
    {
      id: "a",
      date: i.book.asOf,
      account: "Adjustment",
      type: "Asset",
      amount: 1,
      description: "Unbalanced",
      riskDisposition: "unmapped",
      rationale: "",
    },
  ];
  assert.throws(() => e.runStress(i), /Unbalanced/);
});
await test("First floating fixing remains locked under an instantaneous shock", () => {
  const i = input(),
    p = i.book.positions.find((p) => p.id === "floating-bond");
  const a = e.cashflows(p, i.book, i.curve, i.model, false),
    b = e.cashflows(p, i.book, i.curve, i.model, true);
  near(a[0].interest, b[0].interest, 1e-9);
  assert.ok(b[1].interest > a[1].interest);
});
await test("IRS has both legs, reverses sign with direction, and never exchanges notional", () => {
  const i = input(),
    p = i.book.positions.find((p) => p.product === "IRS"),
    a = e.cashflows(p, i.book, i.curve, i.model, true),
    b = e.cashflows({ ...p, payFixed: false }, i.book, i.curve, i.model, true);
  assert.ok(a.some((f) => f.interest !== 0));
  a.forEach((f, k) => {
    assert.equal(f.principal, 0);
    near(f.interest, -b[k].interest, 1e-9);
  });
});
await test("Full-life EVE does not change when the earnings horizon changes", () => {
  const i = input(),
    a = e.runStress(i);
  i.horizonMonths = 60;
  assert.equal(a.metrics.eveDelta, e.runStress(i).metrics.eveDelta);
});
await test("Deposit beta changes stressed funding expense", () => {
  const i = input();
  i.model.parameters.depositBeta = 0;
  const a = e.runStress(i);
  i.model.parameters.depositBeta = 1;
  const b = e.runStress(i);
  assert.ok(b.metrics.coveredStressNii < a.metrics.coveredStressNii);
});
await test("Deposit runoff produces an early principal outflow and preserves total principal", () => {
  const i = input();
  i.model.parameters.runoffPct = 0.25;
  const p = i.book.positions.find((p) => p.product === "Deposit"),
    flows = e.cashflows(p, i.book, i.curve, i.model, true);
  near(
    flows.reduce((s, f) => s + f.principal, 0),
    -p.notional,
  );
  assert.ok(
    flows.some((f) => f.date === "2026-02-01" && f.principal === -375000),
  );
  e.runStress(i);
});
await test("Funding deficits are shown and prevent a complete NII claim", () => {
  const i = oneBond();
  i.book.capital = 0;
  const r = e.runStress(i);
  assert.equal(r.metrics.niiDelta, null);
  assert.ok(r.metrics.minimumProjectedCash < 0);
  assert.equal(r.limits.cash, "breach");
});
await test("Unassessed credit inputs are explicit, not calibrated silently", () => {
  const i = input();
  i.book.positions[0].creditAssessed = false;
  const r = e.runStress(i);
  assert.equal(r.coverage.creditComplete, false);
  assert.ok(r.issues.some((s) => s.includes("credit loss not assessed")));
});
await test("PD stress increases the ECL proxy and reduces P&L", () => {
  const i = input();
  i.model.parameters.pdMultiplier = 3;
  const r = e.runStress(i),
    p = r.positions[0];
  assert.ok(p.stressed[0].ecl > p.baseline[0].ecl);
  assert.ok(p.stressed[0].pnl < p.baseline[0].pnl);
});
await test("FVOCI ECL leaves carrying value at fair value", () => {
  const i = input(),
    p = e.runStress(i).positions.find((p) => p.treatment === "FVOCI");
  assert.equal(p.baseline[0].carrying, p.baseline[0].pv);
  assert.ok(p.baseline[0].ecl > 0);
});
await test("Discount/premium bonds fully redeem and clear accrued interest", () => {
  for (const cost of [95, 105]) {
    const i = oneBond();
    i.book.positions[0].openingValue = cost;
    i.book.positions[0].coupon = 0.03;
    const r = e.runStress(i),
      p = r.positions[0].baseline.at(-1);
    assert.equal(p.carrying, 0);
    assert.equal(p.accrued, 0);
    near(p.interest, p.interestCash + 100 - cost);
  }
});
await test("Month-end schedules clamp dates and include a final short period", () => {
  assert.equal(e.addMonths("2028-01-31", 1), "2028-02-29");
  assert.deepEqual(e.schedule("2026-01-31", "2026-06-15", 3), [
    "2026-04-30",
    "2026-06-15",
  ]);
});
await test("Mismatched dates, duplicate IDs and insufficient curves are rejected", () => {
  let i = input();
  i.curve.asOf = "2025-12-31";
  assert.throws(() => e.runStress(i), /dates must match/);
  i = input();
  i.book.positions.push(i.book.positions[0]);
  assert.throws(() => e.runStress(i), /Duplicate/);
  i = input();
  i.curve.nodes = [
    { years: 0, rate: 0.02 },
    { years: 1, rate: 0.02 },
  ];
  assert.throws(() => e.runStress(i), /cover/);
});
await test("IFRS contradictions, nonfinite values and invalid models are rejected", () => {
  let i = input();
  i.book.positions[0].sppi = "fail";
  assert.throws(() => e.runStress(i), /contradicts/);
  i = input();
  i.model.parameters.parallelBp = NaN;
  assert.throws(() => e.runStress(i), /range/);
  i = input();
  i.model.kind = "python";
  assert.throws(() => e.runStress(i), /model kind/);
});
await test("Runs survive JSON export/import and replay deterministically", async () => {
  const i = input(),
    r = await e.createRun(i.book, i.curve, i.model, 12);
  await e.verifyRun(JSON.parse(JSON.stringify(r)));
  const again = await e.createRun(i.book, i.curve, i.model, 12);
  assert.equal(r.id, again.id);
  assert.equal(r.resultHash, again.resultHash);
});
await test("Input and result tampering is detected", async () => {
  const i = input(),
    r = await e.createRun(i.book, i.curve, i.model, 12);
  let corrupt = structuredClone(r);
  corrupt.inputs.book.positions[0].notional += 1;
  await assert.rejects(() => e.verifyRun(corrupt));
  corrupt = structuredClone(r);
  corrupt.result.metrics.eveDelta = 123;
  await assert.rejects(() => e.verifyRun(corrupt));
});
await test("Saved run inputs are isolated from later draft edits", async () => {
  const i = input(),
    r = await e.createRun(i.book, i.curve, i.model, 12);
  i.book.positions[0].name = "Changed";
  assert.notEqual(r.inputs.book.positions[0].name, "Changed");
  await e.verifyRun(r);
});
await test("Imported cash-flow model replays the built-in baseline and stress economics", async () => {
  const i = input(),
    r = await e.createRun(i.book, i.curve, i.model, 12);
  i.model.kind = "imported-cashflows";
  i.snapshotHash = r.inputs.snapshotHash;
  i.model.external = {
    snapshotHash: i.snapshotHash,
    curve: structuredClone(i.curve),
    positions: r.result.positions
      .filter((p) => p.product !== "Cash")
      .map((p) => ({ id: p.id, baseline: p.baseFlows, stress: p.stressFlows })),
  };
  const imported = e.runStress(i);
  assert.equal(imported.metrics.eveDelta, r.result.metrics.eveDelta);
  assert.equal(imported.metrics.niiDelta, r.result.metrics.niiDelta);
  i.curve.nodes[1].rate += 0.001;
  assert.throws(() => e.runStress(i), /different market curve/);
});
await test("Imported models require the exact snapshot and known instrument IDs", async () => {
  const i = input();
  i.model.kind = "imported-cashflows";
  i.model.external = {
    snapshotHash: "wrong",
    curve: structuredClone(i.curve),
    positions: [],
  };
  assert.throws(() => e.runStress(i), /different portfolio/);
  i.model.external.snapshotHash = "";
  i.model.external.positions = [{ id: "unknown", baseline: [], stress: [] }];
  assert.throws(() => e.runStress(i), /Unknown/);
});
await test("Empty imported exposure and missing debt principal are rejected", async () => {
  const i = oneBond();
  i.model.kind = "imported-cashflows";
  i.model.external = {
    snapshotHash: "",
    curve: structuredClone(i.curve),
    positions: [{ id: i.book.positions[0].id, baseline: [], stress: [] }],
  };
  assert.throws(() => e.runStress(i), /Empty/);
  const flow = {
    date: "2027-01-01",
    interest: 0,
    principal: 0,
    label: "Missing principal",
  };
  i.model.external.positions[0].baseline = [flow];
  i.model.external.positions[0].stress = [flow];
  assert.throws(() => e.runStress(i), /principal/);
});
await test("Imported derivative cash flows close coverage without treating notional as value", () => {
  const i = input();
  i.book.positions = [
    {
      ...i.book.positions[0],
      id: "option",
      product: "Option",
      treatment: "FVTPL",
      openingValue: 1000,
      creditAssessed: false,
    },
  ];
  i.model.kind = "imported-cashflows";
  i.model.external = {
    snapshotHash: "",
    curve: structuredClone(i.curve),
    positions: [
      {
        id: "option",
        baseline: [
          {
            date: "2027-01-01",
            interest: 0,
            principal: 1500,
            label: "Option payoff",
          },
        ],
        stress: [
          {
            date: "2027-01-01",
            interest: 0,
            principal: 500,
            label: "Stressed option payoff",
          },
        ],
      },
    ],
  };
  const r = e.runStress(i);
  assert.equal(r.coverage.covered, 1);
  assert.ok(Math.abs(r.metrics.eveDelta) < 1500);
});
await test("Review metadata requires a distinct declared reviewer", () => {
  const i = input();
  i.model.status = "reviewed";
  i.model.reviewer = i.model.owner;
  i.model.reviewNotes = "Reviewed";
  assert.throws(() => e.runStress(i), /differ/);
});
await test("Parameter sweep retains exact ledger reconciliation", () => {
  for (const rate of [-200, 0, 200])
    for (const runoff of [0, 0.5, 1]) {
      const i = input();
      i.horizonMonths = 24;
      i.model.parameters.parallelBp = rate;
      i.model.parameters.runoffPct = runoff;
      i.model.parameters.pdMultiplier = 2;
      e.runStress(i);
    }
});
await test("Extreme short-dated premium yield still reconciles", () => {
  const i = oneBond();
  i.book.positions[0].maturity = "2026-01-10";
  i.book.positions[0].openingValue = 110;
  const r = e.runStress(i);
  near(r.positions[0].baseline.at(-1).gross, 0);
});
await test("Actual browser evidence replays exactly in Node", async () => {
  const fixture = JSON.parse(
    readFileSync(
      new URL("./fixtures/browser-replay.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(fixture.engineVersion, e.ENGINE_VERSION);
  assert.equal(
    await e.fingerprint(e.runStress(fixture.inputs)),
    fixture.resultHash,
  );
});
await test("Settlement cash flows use currency cents and preserve tiny deposit principal", () => {
  const i = input();
  i.book.positions = [
    { ...i.book.positions[3], notional: 0.01, openingValue: 0.01 },
  ];
  i.model.parameters.runoffPct = 0.5;
  const r = e.runStress(i);
  near(
    r.positions[0].stressFlows.reduce((s, f) => s + f.principal, 0),
    -0.01,
    0.000001,
  );
  for (const f of r.positions[0].stressFlows) {
    near(f.interest * 100, Math.round(f.interest * 100), 0.000001);
    near(f.principal * 100, Math.round(f.principal * 100), 0.000001);
  }
});
console.log(`${count} bank-book / stress checks passed.`);
