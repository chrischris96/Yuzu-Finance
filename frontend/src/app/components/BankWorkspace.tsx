"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import ComparisonWorkspace from "./ComparisonWorkspace";
import TimeChart from "./TimeChart";
import StatementTree from "./StatementTree";
import LedgerTable from "./LedgerTable";
import SavedBookWorkspace, { SavedBookAccess } from "./SavedBookWorkspace";
import { RunRecord } from "@/lib/bank-book";
import { legacyReport } from "@/lib/reporting";
import InstrumentForm from "./InstrumentForm";
import JournalWorkspace, { download } from "./JournalWorkspace";
import {
  Instrument,
  Batch,
  JournalRow,
  portfolio,
  samplePortfolio,
  money,
  dateAt,
  START,
  classify,
  rationale,
  validateInstrument,
  validateJournal,
  PRODUCTS,
} from "@/lib/accounting";
const KEY = "yuzu-bank-demo-v1";
export default function BankWorkspace({
  comparison = false,
}: {
  comparison?: boolean;
}) {
  const [selectedRun, setSelectedRun] = useState<RunRecord | null>(null);
  const [instruments, setInstruments] = useState<Instrument[]>(samplePortfolio);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [month, setMonth] = useState(6);
  const [tab, setTab] = useState("balance");
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const [storageError, setStorageError] = useState("");
  const [editing, setEditing] = useState<Instrument | null | undefined>(
    undefined,
  );
  const [exampleProduct, setExampleProduct] = useState("All");
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (
          saved.version !== 1 ||
          !Array.isArray(saved.instruments) ||
          !Array.isArray(saved.batches) ||
          saved.instruments.length > 250 ||
          saved.batches.length > 100
        )
          throw new Error("Invalid saved workspace");
        const ids = new Set();
        for (const i of saved.instruments) {
          if (
            !i ||
            typeof i.id !== "string" ||
            !i.id ||
            ids.has(i.id) ||
            validateInstrument(i).length
          )
            throw new Error("Invalid saved instrument");
          ids.add(i.id);
        }
        for (const b of saved.batches) {
          if (
            !b ||
            typeof b.name !== "string" ||
            typeof b.id !== "string" ||
            !Array.isArray(b.entries) ||
            validateJournal(b.entries).length
          )
            throw new Error("Invalid saved batch");
        }
        setInstruments(saved.instruments);
        setBatches(saved.batches);
        if (
          Number.isInteger(saved.month) &&
          saved.month >= 0 &&
          saved.month <= 12
        )
          setMonth(saved.month);
      }
    } catch {
      setStorageError(
        "Saved workspace could not be loaded. The sample book is shown; saving is paused. Reset the workspace to replace the unreadable data.",
      );
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready || storageError) return;
    try {
      localStorage.setItem(
        KEY,
        JSON.stringify({ version: 1, instruments, batches, month }),
      );
    } catch {
      setStorageError(
        "Browser storage is unavailable or full. Changes remain in this tab only. Export your workspace before leaving.",
      );
    }
  }, [ready, instruments, batches, month, storageError]);
  const result = portfolio(instruments, batches, month);
  const report = legacyReport(instruments, batches, month);
  const review = result.positions.filter(
    (p) => p.category === "Review required",
  );
  const reset = (sample: boolean) => {
    if (
      !confirm(
        "Replace this browser’s current Yuzu workspace? Export a copy first if you want to keep it.",
      )
    )
      return;
    setInstruments(sample ? samplePortfolio() : []);
    setBatches([]);
    setMonth(6);
    setStorageError("");
    setMessage(
      sample
        ? "Sample bank restored."
        : "Empty bank created with opening capital.",
    );
  };
  const save = (i: Instrument) => {
    if (!instruments.some((x) => x.id === i.id) && instruments.length >= 250) {
      setMessage("Demo limit: 250 instruments.");
      return;
    }
    setInstruments((prev) =>
      prev.some((x) => x.id === i.id)
        ? prev.map((x) => (x.id === i.id ? i : x))
        : [...prev, i],
    );
    setEditing(undefined);
    setMessage(`${i.name} saved. All views have been recalculated.`);
  };
  const addBatch = (entries: JournalRow[], name: string) => {
    if (batches.length >= 100) {
      setMessage("Demo limit: 100 batches.");
      return false;
    }
    const definitions = new Map(
      batches
        .flatMap((b) => b.entries)
        .map((e) => [e.account_code, e.account_name + "|" + e.account_type]),
    );
    for (const e of entries)
      if (
        definitions.has(e.account_code) &&
        definitions.get(e.account_code) !==
          e.account_name + "|" + e.account_type
      ) {
        setMessage(
          `Account ${e.account_code} conflicts with an existing batch. Use the same account name and type.`,
        );
        return false;
      }
    setBatches((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name,
        createdAt: new Date().toISOString(),
        entries,
      },
    ]);
    setMessage(
      "Batch saved. Balances include entries on or before the reporting date.",
    );
    return true;
  };
  if (selectedRun)
    return (
      <SavedBookWorkspace
        run={selectedRun}
        onClose={() => setSelectedRun(null)}
      />
    );
  return (
    <main className="workspace">
      <header>
        <Link className="brand" href="/">
          <Image
            src="/yuzu/yuzu-logo.png"
            width={76}
            height={76}
            alt="Yuzu"
            unoptimized
          />
          <span>FINANCE LAB</span>
        </Link>
        <div className="split">
          <span className="badge">BANK PORTFOLIO · DEMO</span>
          <Link href="/model-card" className="compact">
            Scope & methodology
          </Link>
        </div>
      </header>
      {!comparison && <SavedBookAccess onOpen={setSelectedRun} />}
      <section className="intro">
        <div>
          <p className="eyebrow">YOUR BANK, UNDER THE MICROSCOPE</p>
          <h1>
            {comparison ? (
              "The same book. A different earnings story."
            ) : (
              <>
                One portfolio.
                <br />
                Every accounting decision.
              </>
            )}
          </h1>
          <p>
            {comparison
              ? "Compare measurement scenarios without changing your bank’s book."
              : "Explore financial instruments, accounting decisions and the balance sheet they create."}
          </p>
        </div>
        <button onClick={() => setEditing(null)} disabled={!ready}>
          + Add instrument
        </button>
      </section>
      <nav aria-label="Main navigation">
        {comparison ? (
          <>
            <Link href="/">← Bank workspace</Link>
            <span className="tag">Instrument Comparison</span>
          </>
        ) : (
          <>
            {[
              ["balance", "Balance Sheet"],
              ["portfolio", "Portfolio"],
              ["journal", "Journal Entries"],
              ["accounts", "Trial Balance"],
              ["examples", "Example Library"],
            ].map(([key, label]) => (
              <button
                key={key}
                className={tab === key ? "active" : ""}
                onClick={() => setTab(key)}
              >
                {label}
              </button>
            ))}
            <Link href="/comparison" style={{ padding: "10px 17px" }}>
              Instrument Comparison ↗
            </Link>
          </>
        )}
        <Link href="/stress" style={{ padding: "10px 17px" }}>
          Bank Book & Stress Lab ↗
        </Link>
      </nav>
      <div className="toolbar">
        <div className="split">
          <label>
            Accounting standard
            <select value="ifrs" onChange={() => {}}>
              <option value="ifrs">IFRS · IFRS 9 instruments</option>
              <option disabled>US GAAP — planned</option>
            </select>
          </label>
          <span className="tag">EUR · Bank perspective</span>
        </div>
        <label className="timeline">
          Reporting date · {dateAt(month)}
          <input
            aria-label="Reporting month"
            type="range"
            min="0"
            max="12"
            step="1"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          />
        </label>
      </div>
      {message && (
        <div role="status" className="notice">
          {message}{" "}
          <button
            className="link"
            onClick={() => setMessage("")}
            aria-label="Dismiss status"
          >
            Dismiss
          </button>
        </div>
      )}
      {storageError && (
        <div role="alert" className="notice error">
          {storageError}
        </div>
      )}
      {review.length > 0 && (
        <div className="notice error">
          <strong>
            {review.length} instrument(s) require assessment and are excluded
            from financial totals.
          </strong>{" "}
          Resolve SPPI on the Portfolio tab:{" "}
          {review.map((p) => p.instrument.name).join(", ")}.
        </div>
      )}
      {comparison ? (
        <ComparisonWorkspace instruments={instruments} month={month} />
      ) : (
        <>
          {tab === "balance" && (
            <>
              <div className="metrics">
                <article className="metric-accent">
                  <small>Total assets</small>
                  <strong>{money(result.assets)}</strong>
                  <div className="bar" />
                </article>
                <article>
                  <small>Total liabilities</small>
                  <strong>{money(result.liabilities)}</strong>
                </article>
                <article>
                  <small>Total equity</small>
                  <strong>{money(result.equity)}</strong>
                  <small>
                    Includes profit / loss for the period {money(result.profit)}
                  </small>
                </article>
              </div>
              <StatementTree report={report} />
              <div
                className={`notice ${Math.abs(result.difference) > 0.005 ? "error" : ""}`}
              >
                <strong>
                  {Math.abs(result.difference) < 0.005
                    ? "✓ Balanced"
                    : "Reconciliation difference"}
                </strong>{" "}
                · Assets − liabilities − equity = {money(result.difference)}.{" "}
                {review.length > 0
                  ? "Incomplete book: unresolved instruments are excluded."
                  : "All classified positions and dated adjustments are included."}
              </div>
              <section className="panel">
                <TimeChart
                  title="Your bank over time"
                  description="Assets versus liabilities plus equity, including dated adjustments. The two lines overlap when the book balances."
                  month={month}
                  lines={[
                    {
                      label: "Assets",
                      color: "#216c55",
                      values: Array.from(
                        { length: 13 },
                        (_, m) => portfolio(instruments, batches, m).assets,
                      ),
                    },
                    {
                      label: "Liabilities + equity",
                      color: "#9b4fbb",
                      dashed: true,
                      values: Array.from({ length: 13 }, (_, m) => {
                        const p = portfolio(instruments, batches, m);
                        return p.liabilities + p.equity;
                      }),
                    },
                  ]}
                />
              </section>
              <p className="compact muted">
                Illustrative bank balance sheet for the selected instruments.
                Not a complete IFRS financial statement: taxes, non-financial
                balances and regulatory disclosures are outside scope unless
                added as adjustments.
              </p>
            </>
          )}
          {tab === "examples" && (
            <section className="panel">
              <p className="eyebrow">START WITH A WORKED EXAMPLE</p>
              <h2>Explore the bank’s building blocks</h2>
              <p>
                Sixteen fictional positions cover every product family listed
                below, including funding, falling valuations and maturity.
                Inspecting an example opens a copy you can add to your own bank.
              </p>
              <label>
                Product family
                <select
                  value={exampleProduct}
                  onChange={(e) => setExampleProduct(e.target.value)}
                >
                  <option>All</option>
                  {PRODUCTS.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </label>
              <div className="example-grid">
                {samplePortfolio()
                  .filter(
                    (i) =>
                      exampleProduct === "All" || i.product === exampleProduct,
                  )
                  .map((i) => (
                    <article className="example-card" key={i.id}>
                      <span className="tag">
                        {i.product} · {classify(i)}
                      </span>
                      <h3>{i.name}</h3>
                      <p>{rationale(i)}</p>
                      <small>
                        Reference principal / notional: {money(i.notional)}
                      </small>
                      <div className="actions">
                        <button
                          className="secondary"
                          disabled={!ready}
                          onClick={() =>
                            setEditing({
                              ...i,
                              id: "",
                              name: i.name + " · copy",
                            })
                          }
                        >
                          Inspect / add example
                        </button>
                      </div>
                    </article>
                  ))}
              </div>
              <Link href="/comparison">Compare all examples over time →</Link>
            </section>
          )}
          {tab === "portfolio" && (
            <section className="panel" style={{ marginTop: 24 }}>
              <div className="toolbar">
                <h2>{instruments.length} instruments</h2>
                <span className="muted compact">Opening date: {START}</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Instrument</th>
                      <th>Product / bank position</th>
                      <th>IFRS 9</th>
                      <th>Value at date</th>
                      <th>Inputs</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.positions.map((p) => (
                      <tr key={p.instrument.id}>
                        <td>{p.instrument.name}</td>
                        <td>
                          {p.instrument.product} ·{" "}
                          {p.carrying < 0 ? "liability" : p.instrument.side}
                        </td>
                        <td>
                          <span className="tag">{p.category}</span>
                        </td>
                        <td className="money">
                          {p.category === "Review required"
                            ? "Excluded"
                            : money(p.carrying)}
                        </td>
                        <td>
                          {p.instrument.marketMode === "sample"
                            ? "Illustrative"
                            : "Manual"}
                        </td>
                        <td>
                          <div className="split">
                            <button
                              className="secondary"
                              onClick={() => setEditing(p.instrument)}
                            >
                              Edit
                            </button>
                            <button
                              className="secondary danger"
                              onClick={() => {
                                if (
                                  confirm(
                                    `Remove ${p.instrument.name} and its generated postings?`,
                                  )
                                )
                                  setInstruments(
                                    instruments.filter(
                                      (i) => i.id !== p.instrument.id,
                                    ),
                                  );
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!instruments.length && (
                <div className="empty">
                  <p>Your bank has no instruments yet.</p>
                  <button onClick={() => setEditing(null)}>
                    Add an instrument
                  </button>
                </div>
              )}
              <p className="compact">
                Fair values between opening and year-end are a linear scenario
                path. They are not calculated market prices. All positions are
                EUR equivalents; no FX translation or provider connection is
                active.
              </p>
            </section>
          )}
          {tab === "journal" && (
            <div style={{ marginTop: 24 }}>
              <JournalWorkspace
                batches={batches}
                onAdd={addBatch}
                onDelete={(id) => {
                  if (confirm("Remove this adjustment batch?"))
                    setBatches(batches.filter((b) => b.id !== id));
                }}
                postings={result.instrumentPostings.map((p, k) => ({
                  ...p,
                  account:
                    report.entries[k].code + " · " + report.entries[k].label,
                }))}
              />
            </div>
          )}
          {tab === "accounts" && (
            <section className="panel" style={{ marginTop: 24 }}>
              <h2>Trial Balance</h2>
              <p>
                Combined trial balance for the bank scenario and your adjustment
                batches.
              </p>
              <LedgerTable report={report} />
            </section>
          )}
        </>
      )}
      <footer>
        <div className="toolbar">
          <p>
            Private to this browser ·{" "}
            {ready ? "Local demo workspace" : "Loading saved workspace…"}
            <br />
            No login, uploads to a server, or live market feed.
          </p>
          <div className="split">
            <button
              className="secondary"
              onClick={() =>
                download(
                  "yuzu-workspace.json",
                  JSON.stringify(
                    { version: 1, instruments, batches, month },
                    null,
                    2,
                  ),
                  "application/json",
                )
              }
            >
              Export workspace
            </button>
            <button
              className="secondary"
              disabled={!ready}
              onClick={() => reset(true)}
            >
              Reset sample
            </button>
            <button
              className="secondary"
              disabled={!ready}
              onClick={() => reset(false)}
            >
              Start empty
            </button>
          </div>
        </div>
        <p>
          Sample valuations · IFRS 9 educational scenarios ·{" "}
          <Link href="/model-card">Read calculation scope and sources</Link>
        </p>
      </footer>
      {editing !== undefined && (
        <InstrumentForm
          initial={editing}
          onSave={save}
          onClose={() => setEditing(undefined)}
        />
      )}
    </main>
  );
}
