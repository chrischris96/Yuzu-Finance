"use client";
import { useState } from "react";
import { RunRecord, verifyRun, canonical } from "@/lib/bank-book";
import { money } from "@/lib/accounting";
export default function RunComparison({ runs }: { runs: RunRecord[] }) {
  const [a, setA] = useState(""),
    [b, setB] = useState(""),
    [pair, setPair] = useState<RunRecord[] | null>(null),
    [error, setError] = useState("");
  async function compare() {
    try {
      setError("");
      setPair(null);
      const left = runs.find((r) => r.id === a),
        right = runs.find((r) => r.id === b);
      if (!left || !right) throw Error("Choose two saved runs");
      if (left.id === right.id) throw Error("Choose two different saved runs");
      await verifyRun(left);
      await verifyRun(right);
      if (
        left.inputs.snapshotHash !== right.inputs.snapshotHash ||
        canonical(left.inputs.curve) !== canonical(right.inputs.curve) ||
        left.inputs.horizonMonths !== right.inputs.horizonMonths
      )
        throw Error(
          "Compare models on the same portfolio snapshot, market curve and projection horizon",
        );
      setPair([left, right]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Comparison failed");
    }
  }
  return (
    <section className="panel" style={{ marginTop: 20 }}>
      <h3>Compare two models on the same bank</h3>
      <div className="form-grid">
        {[
          [a, setA],
          [b, setB],
        ].map(([value, set], n) => (
          <label key={n}>
            Run {n ? "B" : "A"}
            <select
              value={value as string}
              onChange={(e) => {
                (set as (v: string) => void)(e.target.value);
                setPair(null);
              }}
            >
              <option value="">Select a saved run</option>
              {runs.map((r) => (
                <option value={r.id} key={r.id}>
                  {r.inputs.model.name} · {r.id.slice(0, 8)}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <button className="secondary" onClick={compare}>
        Verify & compare
      </button>
      {error && <p role="alert">{error}</p>}
      {pair && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Metric</th>
                <th>{pair[0].inputs.model.name}</th>
                <th>{pair[1].inputs.model.name}</th>
              </tr>
            </thead>
            <tbody>
              {(["eveDelta", "niiDelta", "minimumProjectedCash"] as const).map(
                (key, n) => (
                  <tr key={key}>
                    <td>{["ΔEVE", "ΔNII", "Minimum projected cash"][n]}</td>
                    {pair.map((r) => (
                      <td key={r.id}>
                        {r.result.metrics[key] === null
                          ? "Incomplete"
                          : money(r.result.metrics[key]!)}
                      </td>
                    ))}
                  </tr>
                ),
              )}
            </tbody>
          </table>
          <p>
            Both stored runs passed replay verification and use identical book,
            curve and horizon inputs.
          </p>
        </div>
      )}
    </section>
  );
}
