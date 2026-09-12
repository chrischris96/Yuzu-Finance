"use client";
import { useState } from "react";
import Link from "next/link";
import { RunRecord, verifyRun } from "@/lib/bank-book";
import { listRuns } from "@/lib/book-archive";
import { runReport } from "@/lib/reporting";
import { money } from "@/lib/accounting";
import StatementTree from "./StatementTree";
import LedgerTable from "./LedgerTable";
import MitigationWorkspace from "./MitigationWorkspace";
import { download } from "./JournalWorkspace";
export function SavedBookAccess({
  onOpen,
}: {
  onOpen: (run: RunRecord) => void;
}) {
  const [runs, setRuns] = useState<RunRecord[]>([]),
    [message, setMessage] = useState("");
  return (
    <section className="panel">
      <div className="toolbar">
        <div>
          <h3>Open a saved bank book with risk</h3>
          <p>
            Inspect a reproducible stress run using the same four tabs. Your
            editable instrument demo is preserved.
          </p>
        </div>
        <button
          className="secondary"
          onClick={async () => {
            try {
              const rows = await listRuns();
              setRuns(rows);
              setMessage(
                rows.length
                  ? "Choose a run below."
                  : "No saved runs yet. Create one in the stress lab.",
              );
            } catch {
              setMessage(
                "Browser archive unavailable. Use the stress lab to import a run.",
              );
            }
          }}
        >
          Browse saved runs
        </button>
        <Link href="/stress/">Create or import a stress run →</Link>
      </div>
      {message && <p role="status">{message}</p>}
      {runs.length > 0 && (
        <label>
          Saved book
          <select
            defaultValue=""
            onChange={async (e) => {
              const run = runs.find((r) => r.id === e.target.value);
              if (run)
                try {
                  await verifyRun(run);
                  onOpen(run);
                } catch {
                  setMessage(
                    "Run failed integrity/replay checks and was not opened.",
                  );
                }
            }}
          >
            <option value="">Select a saved run</option>
            {runs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.inputs.book.name} · {r.inputs.model.name} · {r.createdAt}
              </option>
            ))}
          </select>
        </label>
      )}
    </section>
  );
}
export default function SavedBookWorkspace({
  run,
  onClose,
}: {
  run: RunRecord;
  onClose: () => void;
}) {
  const [tab, setTab] = useState("Balance Sheet"),
    [month, setMonth] = useState(0),
    [view, setView] = useState<"baseline" | "stress">("stress"),
    [mitigation, setMitigation] = useState<string[] | null>(null),
    [filter, setFilter] = useState("");
  const report = runReport(run, month, view),
    statement = run.result.statements[month][view];
  return (
    <main className="workspace">
      <header>
        <p className="eyebrow">YUZU · REPRODUCIBLE BANK BOOK</p>
        <h1>{run.inputs.book.name}</h1>
        <p>
          {run.inputs.model.name} · {run.inputs.model.version}
        </p>
        <button className="secondary" onClick={onClose}>
          Return to editable instrument demo
        </button>
      </header>
      <div className="toolbar">
        <label>
          Reporting date
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {run.result.dates.map((d, n) => (
              <option key={d} value={n}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label>
          Scenario
          <select
            value={view}
            onChange={(e) => setView(e.target.value as "baseline" | "stress")}
          >
            <option value="baseline">Baseline</option>
            <option value="stress">Stress</option>
          </select>
        </label>
        <button
          className="secondary"
          onClick={() =>
            download(
              "yuzu-run-" + run.id.slice(0, 12) + ".json",
              JSON.stringify(run, null, 2),
              "application/json",
            )
          }
        >
          Export saved run
        </button>
      </div>
      <nav className="tabs" aria-label="Bank book navigation">
        {["Balance Sheet", "Portfolio", "Trial Balance", "Journal Entries"].map(
          (t) => (
            <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>
              {t}
            </button>
          ),
        )}
      </nav>
      <p className="notice">
        Saved snapshot · all four tabs use this run’s postings and inputs.
        Reconciliation {money(statement.difference)}. Edit a separate draft or
        test a mitigation to create a new version.
      </p>
      {tab === "Balance Sheet" && (
        <>
          <div className="metrics">
            <article>
              <small>Assets</small>
              <strong>{money(statement.assets)}</strong>
            </article>
            <article>
              <small>Liabilities</small>
              <strong>{money(statement.liabilities)}</strong>
            </article>
            <article>
              <small>Equity</small>
              <strong>{money(statement.equity)}</strong>
            </article>
          </div>
          <StatementTree report={report} onMitigate={setMitigation} />
          <button
            className="secondary"
            onClick={() => setMitigation(mitigation ? null : [])}
          >
            {mitigation ? "Close mitigation" : "Test a management action"}
          </button>
          {mitigation && (
            <MitigationWorkspace
              key={run.id + mitigation.join(",")}
              run={run}
              ids={mitigation}
            />
          )}
        </>
      )}
      {tab === "Portfolio" && (
        <section className="panel">
          <h2>Portfolio · contract and measurement register</h2>
          <p>
            These inputs belong to the saved run.{" "}
            <Link href="/stress/">Open the stress lab</Link> to import an
            exported book into an editable draft.
          </p>
          <button
            className="secondary"
            onClick={() =>
              download(
                "yuzu-book.json",
                JSON.stringify(run.inputs.book, null, 2),
                "application/json",
              )
            }
          >
            Export book inputs
          </button>
          {report.details.map((d) => (
            <details key={d.id}>
              <summary>
                {d.name} · {d.category} · carrying{" "}
                {d.carrying === null ? "Unavailable" : money(d.carrying)}
              </summary>
              <p>{d.rationale}</p>
              <p>
                {d.repricing} · maturity {d.maturity}
              </p>
              <p>
                Fair value {d.fair === null ? "Unavailable" : money(d.fair)} ·
                P&amp;L {d.pnl === null ? "Unavailable" : money(d.pnl)} · OCI{" "}
                {d.oci === null ? "Unavailable" : money(d.oci)}
              </p>
              <p>
                {d.coverage} · source {d.source} · ID {d.id}
              </p>
            </details>
          ))}
        </section>
      )}
      {tab === "Trial Balance" && (
        <section className="panel">
          <h2>Trial Balance</h2>
          <LedgerTable report={report} />
        </section>
      )}
      {tab === "Journal Entries" && (
        <section className="panel">
          <h2>Journal Entries</h2>
          <label>
            Filter by account, instrument ID or event
            <input value={filter} onChange={(e) => setFilter(e.target.value)} />
          </label>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Account code</th>
                  <th>Account</th>
                  <th>Instrument</th>
                  <th>Event</th>
                  <th>Debit</th>
                  <th>Credit</th>
                </tr>
              </thead>
              <tbody>
                {report.entries
                  .filter((e) =>
                    [e.label, e.code, e.positionId, e.event]
                      .join(" ")
                      .toLowerCase()
                      .includes(filter.toLowerCase()),
                  )
                  .map((e) => (
                    <tr key={e.id}>
                      <td>{e.date}</td>
                      <td>{e.code}</td>
                      <td>{e.label}</td>
                      <td>
                        {report.details.find((d) => d.id === e.positionId)
                          ?.name ?? e.positionId}
                      </td>
                      <td>{e.event}</td>
                      <td>{money(Math.max(0, e.amount))}</td>
                      <td>{money(Math.max(0, -e.amount))}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <p>
            Generated postings are immutable evidence. Adjustments require a new
            draft and run, so an inspected balance cannot silently change.
          </p>
        </section>
      )}
    </main>
  );
}
