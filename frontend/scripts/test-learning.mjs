import "./compile-book.mjs";
import ts from "typescript";
import fs from "node:fs";
import { createRequire } from "node:module";
import assert from "node:assert/strict";
const source = fs.readFileSync(
  new URL("../src/lib/learning-scenarios.ts", import.meta.url),
  "utf8",
);
const code = ts
  .transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  })
  .outputText.replace('require("./bank-book")', 'require("./bank-book.cjs")');
fs.writeFileSync(
  new URL("../.book-build/learning-scenarios.cjs", import.meta.url),
  code,
);
const require = createRequire(import.meta.url),
  e = require("../.book-build/bank-book.cjs"),
  { learningModels } = require("../.book-build/learning-scenarios.cjs");
const models = learningModels(),
  results = models.map((model) =>
    e.runStress({
      book: e.sampleBook(),
      curve: e.sampleCurve(),
      model,
      horizonMonths: 12,
      snapshotHash: "",
    }),
  );
assert.equal(models.length, 3);
for (const r of results) {
  assert.equal(r.coverage.covered, 6);
  assert.equal(r.coverage.accountingComplete, true);
  assert.ok(
    r.statements.every(
      (s) => s.baseline.difference === 0 && s.stress.difference === 0,
    ),
  );
}
assert.equal(e.shockBp(models[0], 5), 200);
assert.ok(e.shockBp(models[1], 0) < 0 && e.shockBp(models[1], 10) > 0);
const position = (id) => results[0].positions.find((p) => p.id === id);
assert.ok(position("bond").stressed[0].pv < position("bond").baseline[0].pv);
assert.ok(position("irs").stressed[0].pv > position("irs").baseline[0].pv);
assert.ok(
  results[2].metrics.minimumProjectedCash <
    results[0].metrics.minimumProjectedCash,
);
assert.ok(results[2].metrics.niiDelta < results[0].metrics.niiDelta);
console.log(
  "PASS learning scenarios: all three reconcile; parallel and twist shocks, bond/swap direction, funding cash and earnings effects",
);
