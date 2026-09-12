"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Book,
  BookPosition,
  Curve,
  Model,
  RunRecord,
  createRun,
  verifyRun,
  sampleBook,
  sampleCurve,
  sampleModel,
  fingerprint,
  canonical,
} from "@/lib/bank-book";
import { saveRun, listRuns, localArchive } from "@/lib/book-archive";
import { validateImport } from "@/lib/book-import";
import { migrateLegacy } from "@/lib/book-migration";
import { money, parseCsv } from "@/lib/accounting";
import { download } from "./JournalWorkspace";
import BookPositionForm from "./BookPositionForm";
import StressPlot from "./StressPlot";
import RunComparison from "./RunComparison";
export default function StressWorkspace() {
  const [book, setBook] = useState<Book>(sampleBook),
    [curve, setCurve] = useState<Curve>(sampleCurve),
    [model, setModel] = useState<Model>(sampleModel),
    [horizon, setHorizon] = useState(12);
  const [tab, setTab] = useState("book"),
    [run, setRun] = useState<RunRecord | null>(null),
    [saved, setSaved] = useState<RunRecord[]>([]),
    [month, setMonth] = useState(0),
    [editing, setEditing] = useState<BookPosition | null>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [local, setLocal] = useState(false),
    [dirty, setDirty] = useState(false),
    [view, setView] = useState<"baseline" | "stress">("stress");
  const bookFile = useRef<HTMLInputElement>(null),
    curveFile = useRef<HTMLInputElement>(null),
    modelFile = useRef<HTMLInputElement>(null),
    runFile = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setLocal(["localhost", "127.0.0.1"].includes(location.hostname));
    listRuns()
      .then(setSaved)
      .catch(() =>
        setMessage(
          "Browser archive unavailable. Export runs to preserve them.",
        ),
      );
  }, []);
  function edit() {
    setDirty(true);
  }
  async function attempt(fn: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Operation failed");
    } finally {
      setBusy(false);
    }
  }
  async function execute() {
    await attempt(async () => {
      const result = await createRun(book, curve, model, horizon);
      setRun(result);
      setMonth(0);
      setTab("results");
      setDirty(false);
      try {
        await saveRun(result);
        setSaved(await listRuns());
        setMessage("Run saved with portfolio and result fingerprints.");
      } catch {
        setMessage(
          "Run calculated, but browser archive failed. Export it before leaving.",
        );
      }
    });
  }
  function draft<T>(setter: (v: T) => void, value: T) {
    setter(value);
    edit();
  }
  async function readFile(
    file: File | undefined,
    kind: "book" | "curve" | "model" | "run",
  ) {
    if (!file) return;
    await attempt(async () => {
      if (file.size > 15_000_000) throw Error("File limit: 15 MB");
      const text = await file.text();
      if (kind === "curve" && file.name.endsWith(".csv")) {
        const [header, ...rows] = parseCsv(text);
        if (header?.join(",") !== "years,zero_rate")
          throw Error(
            "Curve CSV headers must be years,zero_rate; rates are decimals",
          );
        if (rows.some((r) => r.length !== 2 || r.some((x) => !x.trim())))
          throw Error("Every curve row requires two numeric values");
        const candidate = {
          asOf: book.asOf,
          source: file.name,
          nodes: rows.map((r) => ({ years: Number(r[0]), rate: Number(r[1]) })),
        };
        await validateImport("curve", candidate, book, curve, horizon);
        draft(setCurve, candidate);
      } else {
        const data = JSON.parse(text);
        if (kind !== "run")
          await validateImport(kind, data, book, curve, horizon);
        if (kind === "run") {
          await verifyRun(data);
          await saveRun(data);
          setSaved(await listRuns());
          setRun(data);
          setMonth(0);
          setTab("results");
          setDirty(true);
          setMessage(
            "Imported run passed integrity and replay checks. Its inputs are preserved separately from your draft.",
          );
        } else if (kind === "book") {
          if (
            data.schemaVersion !== 1 ||
            !Array.isArray(data.positions) ||
            !Array.isArray(data.adjustments)
          )
            throw Error("Use a version 1 bank-book JSON file");
          draft(setBook, data);
        } else if (kind === "curve") {
          if (!Array.isArray(data.nodes)) throw Error("Curve nodes missing");
          draft(setCurve, data);
        } else {
          if (
            data.schemaVersion !== 1 ||
            !data.parameters ||
            !data.limits ||
            !["cashflow-dcf", "imported-cashflows"].includes(data.kind)
          )
            throw Error("Use a supported versioned model JSON definition");
          draft(setModel, data);
        }
      }
      if (kind !== "run")
        setMessage(
          "Imported draft. Run validation will check all dates, classifications, units and coverage before calculation.",
        );
    });
  }
  const hidden = (
    ref: React.RefObject<HTMLInputElement | null>,
    kind: "book" | "curve" | "model" | "run",
    accept: string,
  ) => (
    <input
      ref={ref}
      type="file"
      accept={accept}
      hidden
      onChange={(e) => {
        void readFile(e.target.files?.[0], kind);
        e.target.value = "";
      }}
    />
  );
  const exportJson = (name: string, data: unknown) =>
    download(name, JSON.stringify(data, null, 2), "application/json");
  const result = run?.result,
    statement = result?.statements[month]?.[view];
  const aggregate = (field: "interest" | "oci" | "pnl", stress: boolean) =>
    result?.dates.map((_, n) =>
      result.positions.reduce(
        (sum, p) =>
          sum + ((stress ? p.stressed : p.baseline)?.[n]?.[field] ?? 0),
        0,
      ),
    ) ?? [];
  const parameter = (
    label: string,
    key: keyof Model["parameters"],
    step = 1,
  ) => (
    <label>
      {label}
      <input
        type="number"
        step={step}
        value={model.parameters[key]}
        onChange={(e) =>
          draft(setModel, {
            ...model,
            status: "draft",
            parameters: { ...model.parameters, [key]: Number(e.target.value) },
          })
        }
      />
    </label>
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
          <span>BANK BOOK & STRESS LAB</span>
        </Link>
        <Link href="/">← Accounting demo</Link>
      </header>
      <section className="intro">
        <div>
          <p className="eyebrow">TRACEABLE INPUTS · REPLAYABLE RESULTS</p>
          <h1>
            Stress the bank.
            <br />
            Explain every movement.
          </h1>
          <p>
            One portfolio, one cash-flow model, connected economic and
            accounting views.
          </p>
        </div>
        <button disabled={busy} onClick={execute}>
          {busy ? "Working…" : "Validate & run stress test"}
        </button>
      </section>
      <nav aria-label="Stress workspace">
        {[
          ["book", "Bank book"],
          ["scenario", "Models & scenarios"],
          ["results", "Results & reconciliation"],
          ["archive", "Saved runs"],
          ["principles", "Principles & coverage"],
        ].map(([key, label]) => (
          <button
            className={key === tab ? "active" : ""}
            key={key}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </nav>
      {message && (
        <div className="notice" role="status">
          {message}
        </div>
      )}
      {dirty && run && (
        <div className="notice error">
          The draft has changed. Results still belong to the saved run shown
          below; run again to calculate the edited assumptions.
        </div>
      )}
      {hidden(bookFile, "book", ".json")}
      {hidden(curveFile, "curve", ".json,.csv")}
      {hidden(modelFile, "model", ".json")}
      {hidden(runFile, "run", ".json")}
      {tab === "book" && (
        <>
          <section className="panel">
            <div className="toolbar">
              <h2>Draft portfolio</h2>
              <div className="split">
                <button
                  className="secondary"
                  onClick={() => bookFile.current?.click()}
                >
                  Import book
                </button>
                <button
                  className="secondary"
                  onClick={() => exportJson("yuzu-bank-book.json", book)}
                >
                  Export book
                </button>
                <button
                  className="secondary"
                  onClick={() =>
                    attempt(async () => {
                      const raw = localStorage.getItem("yuzu-bank-demo-v1");
                      if (!raw)
                        throw Error(
                          "No saved accounting-demo portfolio in this browser",
                        );
                      draft(setBook, migrateLegacy(raw));
                      setMessage(
                        "Imported as a draft. Review credit assumptions, regulatory book and unsupported products. Your original workspace is unchanged.",
                      );
                    })
                  }
                >
                  Import current demo portfolio
                </button>
              </div>
            </div>
            <div className="form-grid">
              <label>
                Book name
                <input
                  value={book.name}
                  onChange={(e) =>
                    draft(setBook, { ...book, name: e.target.value })
                  }
                />
              </label>
              <label>
                Valuation date
                <input
                  type="date"
                  value={book.asOf}
                  onChange={(e) =>
                    draft(setBook, { ...book, asOf: e.target.value })
                  }
                />
              </label>
              <label>
                Opening capital (€)
                <input
                  type="number"
                  value={book.capital}
                  onChange={(e) =>
                    draft(setBook, { ...book, capital: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                Data source / provenance
                <input
                  value={book.source}
                  onChange={(e) =>
                    draft(setBook, { ...book, source: e.target.value })
                  }
                />
              </label>
            </div>
            <p className="compact">
              Opening values are consideration amounts: differences from model
              fair value appear immediately in the fair-value ledger. This is
              not an aged production-book import. All contracts are modelled
              from the snapshot date with no opening accrued interest. EUR,
              ACT/365 fixed, static run-off. Existing portfolios with accrued
              interest need preparation before import. Banking/trading
              designation is independent of IFRS 9.
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Position</th>
                    <th>Contract</th>
                    <th>Regulatory book</th>
                    <th>Accounting</th>
                    <th>Notional / principal</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {book.positions.map((p) => (
                    <tr key={p.id}>
                      <td>
                        {p.name}
                        <small className="muted" style={{ display: "block" }}>
                          {p.id}
                        </small>
                      </td>
                      <td>
                        {p.product} · {p.side}
                        <br />
                        {p.maturity}
                      </td>
                      <td>{p.regulatoryBook}</td>
                      <td>{p.treatment}</td>
                      <td className="money">{money(p.notional)}</td>
                      <td>
                        <div className="split">
                          <button
                            className="secondary"
                            onClick={() => setEditing(p)}
                          >
                            Edit
                          </button>
                          <button
                            className="secondary"
                            onClick={() =>
                              draft(setBook, {
                                ...book,
                                positions: book.positions.filter(
                                  (x) => x.id !== p.id,
                                ),
                              })
                            }
                          >
                            Remove from draft
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="actions">
              <button
                className="secondary"
                onClick={() =>
                  setEditing({
                    ...sampleBook().positions[0],
                    id: crypto.randomUUID(),
                    name: "New instrument",
                  })
                }
              >
                Add instrument
              </button>
            </div>
          </section>
          <section className="panel">
            <h2>Ledger adjustments & risk completeness</h2>
            <p>
              Adjustments must balance by date. They never silently alter
              instrument terms. Unmapped adjustments block complete banking-risk
              totals; classify a truly non-risk adjustment with a documented
              rationale. Financial exposure changes belong in the contract book.
            </p>
            <textarea
              aria-label="Adjustment JSON"
              rows={8}
              defaultValue={JSON.stringify(book.adjustments, null, 2)}
              key={canonical(book.adjustments)}
              onBlur={(e) => {
                try {
                  const adjustments = JSON.parse(e.target.value);
                  if (!Array.isArray(adjustments)) throw Error();
                  draft(setBook, { ...book, adjustments });
                } catch {
                  setMessage(
                    "Adjustment JSON must be an array. Draft was not changed.",
                  );
                }
              }}
            />
            <p className="compact">
              Fields: id, date, account, type, amount (debit positive),
              description, riskDisposition (“unmapped” or “non-risk”),
              rationale. Export the book for a complete template.
            </p>
          </section>
        </>
      )}
      {tab === "scenario" && (
        <>
          <section className="panel">
            <h2>Market data</h2>
            <div className="form-grid">
              <label>
                Curve valuation date
                <input
                  type="date"
                  value={curve.asOf}
                  onChange={(e) =>
                    draft(setCurve, { ...curve, asOf: e.target.value })
                  }
                />
              </label>
              <label>
                Source / observation reference
                <input
                  value={curve.source}
                  onChange={(e) =>
                    draft(setCurve, { ...curve, source: e.target.value })
                  }
                />
              </label>
            </div>
            <p>
              Zero rates, with linear interpolation between nodes. All cash
              flows must fall within the curve; silent extrapolation is
              rejected.
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Tenor (years)</th>
                    <th>Zero rate (%)</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {curve.nodes.map((n, k) => (
                    <tr key={k}>
                      <td>
                        <input
                          aria-label={"Tenor " + k}
                          type="number"
                          step="any"
                          value={n.years}
                          onChange={(e) =>
                            draft(setCurve, {
                              ...curve,
                              nodes: curve.nodes.map((x, j) =>
                                j === k
                                  ? { ...x, years: Number(e.target.value) }
                                  : x,
                              ),
                            })
                          }
                        />
                      </td>
                      <td>
                        <input
                          aria-label={"Zero rate " + k}
                          type="number"
                          step="any"
                          value={Number((n.rate * 100).toFixed(8))}
                          onChange={(e) =>
                            draft(setCurve, {
                              ...curve,
                              nodes: curve.nodes.map((x, j) =>
                                j === k
                                  ? { ...x, rate: Number(e.target.value) / 100 }
                                  : x,
                              ),
                            })
                          }
                        />
                      </td>
                      <td>
                        <button
                          className="secondary"
                          onClick={() =>
                            draft(setCurve, {
                              ...curve,
                              nodes: curve.nodes.filter((_, j) => j !== k),
                            })
                          }
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="actions">
              <button
                className="secondary"
                onClick={() =>
                  draft(setCurve, {
                    ...curve,
                    nodes: [
                      ...curve.nodes,
                      {
                        years: (curve.nodes.at(-1)?.years ?? 0) + 1,
                        rate: 0.03,
                      },
                    ],
                  })
                }
              >
                Add node
              </button>
              <button
                className="secondary"
                onClick={() => curveFile.current?.click()}
              >
                Import curve JSON / CSV
              </button>
              <button
                className="secondary"
                onClick={() => exportJson("yuzu-curve.json", curve)}
              >
                Export curve
              </button>
            </div>
            <small>CSV: years,zero_rate. Use decimal rates: 0.03 = 3%.</small>
          </section>
          <section className="panel">
            <div className="toolbar">
              <h2>Stress model</h2>
              <div className="split">
                <button
                  className="secondary"
                  onClick={() => modelFile.current?.click()}
                >
                  Import model
                </button>
                <button
                  className="secondary"
                  onClick={() => exportJson("yuzu-stress-model.json", model)}
                >
                  Export model
                </button>
              </div>
            </div>
            <label style={{ marginTop: 16 }}>
              Start from an illustrative scenario
              <select
                defaultValue=""
                onChange={(e) => {
                  const kind = e.target.value;
                  const next = sampleModel();
                  if (kind === "zero") {
                    next.name = "No-shock control";
                    next.parameters.parallelBp = 0;
                  }
                  if (kind === "down") {
                    next.name = "Rates fall −200 bp";
                    next.parameters.parallelBp = -200;
                  }
                  if (kind === "steepen") {
                    next.name = "Yield curve steepening";
                    next.parameters.parallelBp = 0;
                    next.parameters.shortBp = -100;
                    next.parameters.longBp = 150;
                  }
                  if (kind === "runoff") {
                    next.name = "Deposit withdrawal stress";
                    next.parameters.parallelBp = 0;
                    next.parameters.runoffPct = 0.3;
                  }
                  if (kind === "combined") {
                    next.name = "Combined rates, funding and credit stress";
                    next.parameters.runoffPct = 0.2;
                    next.parameters.pdMultiplier = 3;
                    next.parameters.spreadBp = 100;
                  }
                  next.id = kind || "parallel-up";
                  draft(setModel, next);
                }}
              >
                <option value="" disabled>
                  Select a template (replaces model draft)
                </option>
                <option value="up">Rates +200 bp</option>
                <option value="down">Rates −200 bp</option>
                <option value="steepen">Curve steepening</option>
                <option value="runoff">Deposit withdrawal</option>
                <option value="combined">Combined stress</option>
                <option value="zero">No-shock control</option>
              </select>
            </label>
            <div className="form-grid">
              <label>
                Model name
                <input
                  value={model.name}
                  onChange={(e) =>
                    draft(setModel, {
                      ...model,
                      status: "draft",
                      name: e.target.value,
                    })
                  }
                />
              </label>
              <label>
                Model version
                <input
                  value={model.version}
                  onChange={(e) =>
                    draft(setModel, {
                      ...model,
                      status: "draft",
                      version: e.target.value,
                    })
                  }
                />
              </label>
              <label>
                Owner
                <input
                  value={model.owner}
                  onChange={(e) =>
                    draft(setModel, {
                      ...model,
                      status: "draft",
                      owner: e.target.value,
                    })
                  }
                />
              </label>
              <label>
                Purpose
                <input
                  value={model.purpose}
                  onChange={(e) =>
                    draft(setModel, {
                      ...model,
                      status: "draft",
                      purpose: e.target.value,
                    })
                  }
                />
              </label>
              <label>
                Source / methodology
                <input
                  value={model.source}
                  onChange={(e) =>
                    draft(setModel, {
                      ...model,
                      status: "draft",
                      source: e.target.value,
                    })
                  }
                />
              </label>
              <label>
                Limitations
                <input
                  value={model.limitations}
                  onChange={(e) =>
                    draft(setModel, {
                      ...model,
                      status: "draft",
                      limitations: e.target.value,
                    })
                  }
                />
              </label>
              <label>
                Projection horizon
                <select
                  value={horizon}
                  onChange={(e) => draft(setHorizon, Number(e.target.value))}
                >
                  <option value={12}>12 months</option>
                  <option value={24}>24 months</option>
                  <option value={60}>60 months</option>
                </select>
              </label>
              <label>
                Discount convention
                <select
                  value={model.compounding}
                  onChange={(e) =>
                    draft(setModel, {
                      ...model,
                      compounding: e.target.value as Model["compounding"],
                      status: "draft",
                    })
                  }
                >
                  <option value="continuous">Continuous zero rates</option>
                  <option value="annual">Annual compounding</option>
                </select>
              </label>
              {parameter("Parallel rate shock (bp)", "parallelBp")}
              {parameter("Short-end shock (bp; exponential decay)", "shortBp")}
              {parameter("Long-end shock (bp; increases with tenor)", "longBp")}
              {parameter(
                "Credit-spread shock (bp; separate from IRRBB)",
                "spreadBp",
              )}
              {parameter("Deposit repricing beta (0–2)", "depositBeta", 0.05)}
              {parameter("Assumed deposit life (months)", "depositLifeMonths")}
              {parameter(
                "Deposit withdrawal fraction after 1 month (0–1)",
                "runoffPct",
                0.05,
              )}
              {parameter("PD stress multiplier", "pdMultiplier", 0.1)}
              {(["eveLoss", "niiLoss", "minimumCash"] as const).map(
                (key, k) => (
                  <label key={key}>
                    {
                      [
                        "EVE loss limit (€)",
                        "Cumulative NII loss limit (€)",
                        "Minimum projected settlement cash (€)",
                      ][k]
                    }
                    <input
                      type="number"
                      value={model.limits[key]}
                      onChange={(e) =>
                        draft(setModel, {
                          ...model,
                          status: "draft",
                          limits: {
                            ...model.limits,
                            [key]: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </label>
                ),
              )}
            </div>
            <p className="notice">
              These are user-defined scenarios, not the Basel supervisory shock
              calibration. Rate shocks persist; the first floating period uses
              its supplied fixing. Deposit beta and life apply to both
              scenarios, while withdrawals and PD multipliers affect stress
              only. ECL is a transparent proxy, not a validated IFRS 9 credit
              model.
            </p>
            <details>
              <summary>Declared review & model governance</summary>
              <div className="form-grid">
                <label>
                  Review status
                  <select
                    value={model.status}
                    onChange={(e) =>
                      draft(setModel, {
                        ...model,
                        status: e.target.value as Model["status"],
                      })
                    }
                  >
                    <option value="draft">Draft / unreviewed</option>
                    <option value="reviewed">Review recorded</option>
                  </select>
                </label>
                <label>
                  Reviewer
                  <input
                    value={model.reviewer}
                    onChange={(e) =>
                      draft(setModel, { ...model, reviewer: e.target.value })
                    }
                  />
                </label>
                <label className="full">
                  Review evidence / notes
                  <textarea
                    value={model.reviewNotes}
                    onChange={(e) =>
                      draft(setModel, { ...model, reviewNotes: e.target.value })
                    }
                  />
                </label>
              </div>
              <p>
                Names are declarations in this single-user lab, not
                authenticated approvals. Model and limit edits reset review to
                draft. A recorded review is not certification.
              </p>
            </details>
            <details>
              <summary>Import an external cash-flow model</summary>
              <p>
                Use a versioned JSON model with kind “imported-cashflows”. For
                each covered instrument provide ordered baseline and stressed
                cash flows with date, interest, principal and label, in signed
                EUR amounts. The file must carry this exact portfolio’s SHA-256
                fingerprint. Discounting, accounting and reconciliation then run
                in Yuzu. Missing products remain visibly uncovered; executable
                Python or JavaScript is not uploaded or run.
              </p>
              <button
                className="secondary"
                disabled={!run}
                onClick={() =>
                  attempt(async () => {
                    if (!run) throw Error("Run a baseline first");
                    if ((await fingerprint(book)) !== run.inputs.snapshotHash)
                      throw Error(
                        "Run this edited portfolio before exporting its model template",
                      );
                    exportJson("yuzu-external-cashflow-model.json", {
                      ...run.inputs.model,
                      id: "external-model",
                      name: "External cash-flow model",
                      version: "1.0",
                      kind: "imported-cashflows",
                      status: "draft",
                      external: {
                        snapshotHash: run.inputs.snapshotHash,
                        curve: structuredClone(run.inputs.curve),
                        positions: run.result.positions
                          .filter((p) => !p.missing && p.product !== "Cash")
                          .map((p) => ({
                            id: p.id,
                            baseline: p.baseFlows,
                            stress: p.stressFlows,
                          })),
                      },
                    });
                  })
                }
              >
                Download external-model template from last run
              </button>
            </details>
          </section>
        </>
      )}
      {tab === "results" &&
        (!run || !result ? (
          <section className="panel empty">
            Validate and run the draft portfolio to produce results.
          </section>
        ) : (
          <>
            <section className="panel">
              <div className="toolbar">
                <div>
                  <p className="eyebrow">SAVED RUN · {run.inputs.model.name}</p>
                  <h2>{run.inputs.book.name}</h2>
                  <small className="muted">
                    {run.createdAt} · {result.engineVersion}
                    <br />
                    Run fingerprint: {run.id.slice(0, 20)}…
                  </small>
                </div>
                <button
                  className="secondary"
                  onClick={() =>
                    exportJson("yuzu-run-" + run.id.slice(0, 12) + ".json", run)
                  }
                >
                  Export reproducible run
                </button>
              </div>
              <div className="metrics">
                <article>
                  <small>Banking-book ΔEVE · full remaining life</small>
                  <strong>
                    {result.metrics.eveDelta === null
                      ? "Incomplete"
                      : money(result.metrics.eveDelta)}
                  </strong>
                  <small>{result.limits.eve}</small>
                </article>
                <article>
                  <small>
                    Banking-book ΔNII · {run.inputs.horizonMonths} months
                  </small>
                  <strong>
                    {result.metrics.niiDelta === null
                      ? "Incomplete"
                      : money(result.metrics.niiDelta)}
                  </strong>
                  <small>{result.limits.nii}</small>
                </article>
                <article>
                  <small>Minimum projected cash · all positions</small>
                  <strong>
                    {result.metrics.minimumProjectedCash === null
                      ? "Incomplete"
                      : money(result.metrics.minimumProjectedCash)}
                  </strong>
                  <small>{result.limits.cash} · not LCR</small>
                </article>
              </div>
              <p>
                Banking risk coverage: {result.coverage.covered}/
                {result.coverage.bankingPositions} positions. Accounting
                coverage:{" "}
                {result.coverage.accountingComplete
                  ? "complete for this model"
                  : "incomplete"}
                . Credit inputs:{" "}
                {result.coverage.creditComplete
                  ? "assessed / not applicable"
                  : "incomplete"}
                . Accounting equity is not regulatory capital. Mixed
                spread/credit scenarios are broader stress tests, not pure
                IRRBB.
              </p>
              {result.issues.length > 0 && (
                <div className="notice error">
                  <strong>Coverage and interpretation issues</strong>
                  <ul>
                    {result.issues.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </div>
              )}
              {result.metrics.eveDelta === null && (
                <p>
                  Covered subset only: ΔEVE{" "}
                  {money(result.metrics.coveredEveDelta)}. This is not a
                  whole-bank result.
                </p>
              )}
              <label>
                Reporting date · {result.dates[month]}
                <input
                  type="range"
                  min={0}
                  max={result.dates.length - 1}
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                />
              </label>
            </section>
            <div className="columns">
              <section className="panel">
                <StressPlot
                  title="Cumulative interest · covered positions"
                  dates={result.dates}
                  selected={month}
                  lines={[
                    {
                      name: "Baseline interest",
                      color: "#216c55",
                      values: aggregate("interest", false),
                    },
                    {
                      name: "Stressed interest",
                      color: "#9b4fbb",
                      values: aggregate("interest", true),
                    },
                  ]}
                />
              </section>
              <section className="panel">
                <StressPlot
                  title="P&L and OCI · covered accounting positions"
                  dates={result.dates}
                  selected={month}
                  lines={[
                    {
                      name: "Baseline P&L",
                      color: "#216c55",
                      values: aggregate("pnl", false),
                    },
                    {
                      name: "Stress P&L",
                      color: "#2458a6",
                      values: aggregate("pnl", true),
                    },
                    {
                      name: "Stress OCI reserve",
                      color: "#9b4fbb",
                      values: aggregate("oci", true),
                    },
                  ]}
                />
              </section>
            </div>
            <section className="panel">
              <h2>Portfolio coverage & attribution</h2>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Position</th>
                      <th>Scope</th>
                      <th>Baseline FV at date</th>
                      <th>Stress FV at date</th>
                      <th>ΔEVE at inception</th>
                      <th>Coverage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.positions.map((p) => (
                      <tr key={p.id}>
                        <td>{p.name}</td>
                        <td>
                          {p.regulatoryBook} · {p.treatment}
                        </td>
                        <td>
                          {p.baseline
                            ? money(p.baseline[month].pv)
                            : "Not calculated"}
                        </td>
                        <td>
                          {p.stressed
                            ? money(p.stressed[month].pv)
                            : "Not calculated"}
                        </td>
                        <td>
                          {p.stressed && p.baseline
                            ? money(p.stressed[0].pv - p.baseline[0].pv)
                            : "Not calculated"}
                        </td>
                        <td>
                          {p.missing ??
                            (p.treatment === "Unresolved"
                              ? "Risk covered; accounting unresolved"
                              : "Cash-flow model covered")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <section className="panel">
              <div className="toolbar">
                <h2>Balance sheet & trial balance</h2>
                <label>
                  Scenario
                  <select
                    value={view}
                    onChange={(e) =>
                      setView(e.target.value as "baseline" | "stress")
                    }
                  >
                    <option value="baseline">Baseline</option>
                    <option value="stress">Stress</option>
                  </select>
                </label>
              </div>
              {statement && (
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
                      <small>Accounting equity</small>
                      <strong>{money(statement.equity)}</strong>
                    </article>
                  </div>
                  <p
                    className={`notice ${statement.difference !== 0 || result.reconciliation[month][view] !== 0 ? "error" : ""}`}
                  >
                    Accounting equation difference:{" "}
                    {money(statement.difference)}. Instrument-to-ledger
                    reconciliation difference:{" "}
                    {money(result.reconciliation[month][view])}.{" "}
                    {result.coverage.accountingComplete
                      ? ""
                      : "Unresolved / unsupported positions retain opening carrying values; the projected statement is incomplete."}
                  </p>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Account</th>
                          <th>Type</th>
                          <th>Debit</th>
                          <th>Credit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statement.rows.map((r, k) => (
                          <tr key={k}>
                            <td>{r.account}</td>
                            <td>{r.type}</td>
                            <td className="money">
                              {r.balance > 0 ? money(r.balance) : "—"}
                            </td>
                            <td className="money">
                              {r.balance < 0 ? money(-r.balance) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
            <section className="panel">
              <h2>Trace the monthly journal</h2>
              <p>
                {result.dates[month]} · {view}. Each generated event has an
                equal debit and credit.
              </p>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Position ID</th>
                      <th>Event</th>
                      <th>Account</th>
                      <th>Debit</th>
                      <th>Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(view === "stress"
                      ? result.stressJournal
                      : result.baselineJournal
                    )
                      .filter((p) => p.date === result.dates[month])
                      .map((p, k) => (
                        <tr key={k}>
                          <td>{p.positionId}</td>
                          <td>{p.event}</td>
                          <td>{p.account}</td>
                          <td>{p.amount > 0 ? money(p.amount) : "—"}</td>
                          <td>{p.amount < 0 ? money(-p.amount) : "—"}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </section>
            <section className="panel">
              <details>
                <summary>Full cash-flow trace</summary>
                {result.positions.map((p) => (
                  <details key={p.id}>
                    <summary>
                      {p.name} · {view}
                    </summary>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Payment date</th>
                            <th>Interest</th>
                            <th>Principal</th>
                            <th>Source / event</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(view === "stress"
                            ? p.stressFlows
                            : p.baseFlows
                          ).map((f, k) => (
                            <tr key={k}>
                              <td>{f.date}</td>
                              <td>{money(f.interest)}</td>
                              <td>{money(f.principal)}</td>
                              <td>{f.label}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                ))}
              </details>
              <details>
                <summary>Monthly statement values & reconciliation</summary>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Baseline assets</th>
                        <th>Stress assets</th>
                        <th>Stress liabilities</th>
                        <th>Stress equity</th>
                        <th>Stress cash</th>
                        <th>Ledger difference</th>
                        <th>Subledger difference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.statements.map((s, k) => (
                        <tr key={s.date}>
                          <td>{s.date}</td>
                          {[
                            s.baseline.assets,
                            s.stress.assets,
                            s.stress.liabilities,
                            s.stress.equity,
                            s.stress.cash,
                            s.stress.difference,
                            result.reconciliation[k].stress,
                          ].map((v, j) => (
                            <td key={j} className="money">
                              {money(v)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
              <details>
                <summary>Saved assumptions</summary>
                <ul>
                  {result.assumptions.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </details>
            </section>
          </>
        ))}
      {tab === "archive" && (
        <section className="panel">
          <h2>Immutable calculation runs</h2>
          <p>
            Each run embeds its inputs and results with SHA-256 fingerprints.
            Import verifies integrity and recalculates the result. Fingerprints
            establish consistency, not authorship. Browser archives are local to
            this device; exported files and the optional local SQLite service
            provide recovery outside the browser.
          </p>
          <div className="split">
            <button
              className="secondary"
              onClick={() => runFile.current?.click()}
            >
              Import & replay run
            </button>
            {local && (
              <>
                <button
                  className="secondary"
                  disabled={!run || busy}
                  onClick={() =>
                    attempt(async () => {
                      if (!run) return;
                      await localArchive("POST", run);
                      setMessage(
                        "Run verified and saved to the local SQLite archive.",
                      );
                    })
                  }
                >
                  Save current run to local database
                </button>
                <button
                  className="secondary"
                  onClick={() =>
                    attempt(async () => {
                      const records = (await localArchive(
                        "GET",
                      )) as RunRecord[];
                      for (const r of records) await saveRun(r);
                      setSaved(await listRuns());
                      setMessage(
                        "Local database records verified and restored to the browser archive.",
                      );
                    })
                  }
                >
                  Restore from local database
                </button>
              </>
            )}
          </div>
          <p className="compact">
            Local service: run npm run book:server in the frontend directory. It
            accepts only loopback clients and the local preview. The public
            website does not connect to a private database. The original Oracle
            prototype and data are not overwritten.
          </p>
          <RunComparison runs={saved} />
          {saved.map((r) => (
            <article
              className="example-card"
              key={r.id}
              style={{ marginTop: 16 }}
            >
              <h3>
                {r.inputs.book.name} · {r.inputs.model.name}
              </h3>
              <p>
                {r.createdAt} · {r.inputs.model.version} · {r.id.slice(0, 20)}…
              </p>
              <div className="split">
                <button
                  className="secondary"
                  onClick={() =>
                    attempt(async () => {
                      await verifyRun(r);
                      setRun(r);
                      setMonth(0);
                      setTab("results");
                      setDirty(true);
                      setMessage(
                        "Replay matched the stored result fingerprint.",
                      );
                    })
                  }
                >
                  Replay & inspect
                </button>
                <button
                  className="secondary"
                  onClick={() => {
                    setBook(structuredClone(r.inputs.book));
                    setCurve(structuredClone(r.inputs.curve));
                    setModel({
                      ...structuredClone(r.inputs.model),
                      status: "draft",
                    });
                    setHorizon(r.inputs.horizonMonths);
                    setDirty(true);
                    setTab("book");
                  }}
                >
                  Create draft from run
                </button>
                <button
                  className="secondary"
                  onClick={() =>
                    exportJson("yuzu-run-" + r.id.slice(0, 12) + ".json", r)
                  }
                >
                  Export
                </button>
              </div>
            </article>
          ))}
          {!saved.length && <p>No saved runs yet.</p>}
        </section>
      )}
      {tab === "principles" && (
        <section className="panel">
          <p className="eyebrow">
            BASEL COMMITTEE PRINCIPLES · PROPORTIONATE IMPLEMENTATION
          </p>
          <h2>What is implemented, and what still needs judgement</h2>
          <p>
            This is a research and portfolio lab informed by Basel Committee
            principles. It is not a Basel-compliant regulatory reporting system.
            Model assumptions and input completeness remain visible alongside
            results.
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Principle / concern</th>
                  <th>Implemented control</th>
                  <th>Boundary</th>
                </tr>
              </thead>
              <tbody>
                {[
                  [
                    "Defined objective",
                    "Named model purpose, owner, version, limits and horizon",
                    "Limits are user-defined; not supervisory thresholds",
                  ],
                  [
                    "Data integrity & reproducibility",
                    "Dated curves, strict imports, SHA-256 snapshots, deterministic replay, append-only local archive",
                    "No external identity signatures or provider feed",
                  ],
                  [
                    "Completeness",
                    "Instrument coverage and unmapped adjustments; incomplete whole-book results withheld",
                    "Foreign currency and specialised products need additional modelling",
                  ],
                  [
                    "Accounting reconciliation",
                    "Same cash flows drive valuations, earnings and paired postings; subledger-to-ledger bridge",
                    "No arbitrary journal entry silently changes a financial contract",
                  ],
                  [
                    "Risk assumptions",
                    "Explicit curve shocks, deposit beta/life/runoff, current fixings and PD/LGD proxy",
                    "No calibration, default simulation, Stage 3 or supervisory model approval",
                  ],
                  [
                    "Separate reporting views",
                    "Banking/trading book independent of AC/FVOCI/FVTPL; full-life EVE versus horizon NII",
                    "No CET1, RWA, LCR, hedge designation or own-credit accounting",
                  ],
                  [
                    "Validation & review",
                    "Benchmark regression tests, import validation, model review metadata and immutable run evidence",
                    "Review declarations are not authenticated independent validation",
                  ],
                ].map((row) => (
                  <tr key={row[0]}>
                    {row.map((cell, k) => (
                      <td key={k}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Sources:{" "}
            <a href="https://www.bis.org/bcbs/publ/d450.pdf">
              Stress-testing principles
            </a>
            , <a href="https://www.bis.org/publ/bcbs239.pdf">BCBS 239</a>,{" "}
            <a href="https://www.bis.org/committees/bcbs/basel-framework/standard/srp/98/inforce/2026-01-01/published/2024-07-16">
              IRRBB application guidance effective 2026
            </a>
            .
          </p>
        </section>
      )}
      <footer>
        <p>
          Draft edits do not overwrite saved runs. Fictional example data · no
          paid services · no automatic live deployment.
        </p>
      </footer>
      {editing && (
        <BookPositionForm
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={(p) => {
            draft(setBook, {
              ...book,
              positions: book.positions.some((x) => x.id === p.id)
                ? book.positions.map((x) => (x.id === p.id ? p : x))
                : [...book.positions, p],
            });
            setEditing(null);
          }}
        />
      )}
    </main>
  );
}
