"use client";
import { useState } from "react";
import { RunRecord } from "@/lib/bank-book";
import { Action, Proposal, propose, postingChanges } from "@/lib/mitigation";
import { saveRun } from "@/lib/book-archive";
import { money } from "@/lib/accounting";
import { runReport } from "@/lib/reporting";
import StatementTree from "./StatementTree";
import StressPlot from "./StressPlot";
import { download } from "./JournalWorkspace";
export default function MitigationWorkspace({
  run,
  ids = [],
}: {
  run: RunRecord;
  ids?: string[];
}) {
  const [action, setAction] = useState<Action>({
    kind: "funding",
    positionId:
      ids[0] ??
      run.inputs.book.positions.find((p) => p.product === "Bond")?.id ??
      "",
    amount: 100000,
    pricePct: 100,
    coupon: 0.04,
    months: 24,
    costs: 100,
    collateral: 0,
    executionDate: run.inputs.book.asOf,
    rationale: "",
  });
  const [proposal, setProposal] = useState<Proposal | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [ack, setAck] = useState(false),
    [applied, setApplied] = useState(false);
  function change<K extends keyof Action>(k: K, v: Action[K]) {
    setAction({ ...action, [k]: v });
    setProposal(null);
    setAck(false);
    setApplied(false);
  }
  const changes = proposal ? postingChanges(proposal) : [];
  const number = (
    k: "amount" | "pricePct" | "coupon" | "months" | "costs" | "collateral",
    label: string,
  ) => (
    <label>
      {label}
      <input
        type="number"
        step="any"
        value={action[k]}
        onChange={(e) => change(k, Number(e.target.value))}
      />
    </label>
  );
  return (
    <section className="panel mitigation-workspace">
      <p className="eyebrow">MANAGEMENT ACTION · SEPARATE SIMULATED BOOK</p>
      <h2>Test a mitigation</h2>
      <p>
        Risk limits: EVE {run.result.limits.eve}; NII {run.result.limits.nii};
        cash {run.result.limits.cash}. A warning does not itself create an
        accounting entry. Test an action, examine all outcomes, then save a
        separate book version.
      </p>
      <p>
        These are opening-date pro-forma alternatives. Execution occurs on{" "}
        {run.inputs.book.asOf}, before the modelled shock. They do not simulate
        reacting later during a crisis. Funding availability, executable prices,
        costs and collateral are user assumptions.
      </p>
      <div className="form-grid">
        <label>
          Action
          <select
            value={action.kind}
            onChange={(e) => change("kind", e.target.value as Action["kind"])}
          >
            <option value="funding">Raise term funding</option>
            <option value="swap">Add pay-fixed / receive-floating IRS</option>
            <option value="sale">Sell part or all of an asset bond</option>
          </select>
        </label>
        <label>
          Execution date
          <input type="date" value={action.executionDate} readOnly />
        </label>
        {action.kind === "sale" && (
          <label>
            Bond
            <select
              value={action.positionId}
              onChange={(e) => change("positionId", e.target.value)}
            >
              <option value="">Select bond</option>
              {run.inputs.book.positions
                .filter((p) => p.product === "Bond" && p.side === "asset")
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {money(p.notional)}
                  </option>
                ))}
            </select>
          </label>
        )}
        {number("amount", "Notional / funding amount · EUR")}
        {action.kind === "sale" ? (
          number("pricePct", "Execution price · % of par")
        ) : (
          <>
            {number("coupon", "Fixed rate · decimal (0.04 = 4%)")}
            {number("months", "Maturity · whole months")}
          </>
        )}
        {number("costs", "Immediate execution costs · EUR")}
        {number(
          "collateral",
          "Cash collateral restricted for the entire horizon · EUR",
        )}
        <label>
          Feasibility and risk objective
          <textarea
            value={action.rationale}
            onChange={(e) => change("rationale", e.target.value)}
            placeholder="Explain the risk, assumed execution availability and acceptable trade-offs."
          />
        </label>
      </div>
      <p className="muted">
        IRS is FVTPL without hedge accounting; its baseline fair value is
        settled up front. Credit/CVA, variable margin, collateral release and
        transaction taxes are not modelled. A sale reduces the original holding;
        it does not automatically reinvest or diversify it.
      </p>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setMessage("");
          try {
            setProposal(await propose(run, action));
            setApplied(false);
          } catch (e) {
            setMessage(e instanceof Error ? e.message : "Simulation failed");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Calculating proposal…" : "Compare proposed action"}
      </button>
      {message && <p role="status">{message}</p>}
      {proposal && (
        <>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Measure</th>
                  <th>Original book · baseline</th>
                  <th>Original book · stress</th>
                  <th>Proposed book · stress</th>
                </tr>
              </thead>
              <tbody>
                {(
                  ["cash", "assets", "liabilities", "equity", "pnl"] as const
                ).map((k) => (
                  <tr key={k}>
                    <th>End-horizon {k}</th>
                    <td>{money(run.result.statements.at(-1)!.baseline[k])}</td>
                    <td>{money(run.result.statements.at(-1)!.stress[k])}</td>
                    <td>
                      {money(
                        proposal.child.result.statements.at(-1)!.stress[k],
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Risk measure</th>
                  <th>Original</th>
                  <th>Proposed</th>
                </tr>
              </thead>
              <tbody>
                {(
                  ["eveDelta", "niiDelta", "minimumProjectedCash"] as const
                ).map((k) => (
                  <tr key={k}>
                    <th>{k}</th>
                    <td>
                      {run.result.metrics[k] === null
                        ? "Not assessed"
                        : money(run.result.metrics[k]!)}
                    </td>
                    <td>
                      {proposal.child.result.metrics[k] === null
                        ? "Not assessed"
                        : money(proposal.child.result.metrics[k]!)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Proposed limits: EVE {proposal.child.result.limits.eve}; NII{" "}
            {proposal.child.result.limits.nii}; cash{" "}
            {proposal.child.result.limits.cash}. Compare each Δ with its own
            book baseline. Differences between Δ measures are mitigation
            sensitivities, not recognised gains.
          </p>
          <StressPlot
            title="Available settlement cash over time"
            dates={run.result.dates}
            selected={0}
            lines={[
              {
                name: "Original baseline",
                color: "#637c86",
                values: run.result.statements.map((s) => s.baseline.cash),
              },
              {
                name: "Original stress",
                color: "#b17c42",
                values: run.result.statements.map((s) => s.stress.cash),
              },
              {
                name: "Proposed stress",
                color: "#216c55",
                values: proposal.child.result.statements.map(
                  (s) => s.stress.cash,
                ),
              },
            ]}
          />
          <details>
            <summary>
              Opening-date posting differences · original versus proposed book
            </summary>
            <p>
              This is a reconciled pro-forma difference, not a historical trade
              journal or permission to backdate postings. The capital bridge
              offsets simulated opening funding so shareholder capital is not
              created by the action.
            </p>
            <table>
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Debit</th>
                  <th>Credit</th>
                </tr>
              </thead>
              <tbody>
                {changes.map((p, i) => (
                  <tr key={i}>
                    <td>{p.account}</td>
                    <td>{money(Math.max(0, p.amount))}</td>
                    <td>{money(Math.max(0, -p.amount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>
              Posting difference sum:{" "}
              {money(changes.reduce((s, p) => s + p.amount, 0))}
            </p>
          </details>
          <StatementTree
            report={runReport(
              proposal.child,
              proposal.child.inputs.horizonMonths,
              "stress",
            )}
          />
          <label>
            <input
              type="checkbox"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
            />{" "}
            I reviewed execution assumptions, costs, coverage and the new book’s
            accounting and risk results.
          </label>
          <div className="toolbar">
            <button
              disabled={!ack || busy || applied}
              onClick={async () => {
                setBusy(true);
                try {
                  await saveRun(proposal.parent);
                  await saveRun(proposal.child);
                  setApplied(true);
                  setMessage(
                    "New simulated book saved in the run archive. Original run preserved. Export the proposal to retain the complete action and both runs together.",
                  );
                } catch {
                  setMessage(
                    "Archive unavailable. Export the proposal to preserve it; the original book has not changed.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              {applied
                ? "New book version saved"
                : "Apply to new simulated book version"}
            </button>
            <button
              className="secondary"
              onClick={() =>
                download(
                  "yuzu-mitigation-" + proposal.id.slice(0, 12) + ".json",
                  JSON.stringify(proposal, null, 2),
                  "application/json",
                )
              }
            >
              Export action and both runs
            </button>
          </div>
        </>
      )}
      <p>
        <a
          href="https://www.bis.org/committees/bcbs/basel-consolidated-guidelines/module/rma/30"
          target="_blank"
          rel="noreferrer"
        >
          BIS stress-testing principles
        </a>
        : use results to inform decisions, challenge assumptions and document
        plausible management actions. These simulations are educational and have
        not been independently validated.
      </p>
    </section>
  );
}
