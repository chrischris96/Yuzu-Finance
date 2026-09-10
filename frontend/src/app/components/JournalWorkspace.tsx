"use client";
import { useRef, useState } from "react";
import {
  Batch,
  JournalRow,
  Posting,
  validateJournal,
  journalFromCsv,
  SAMPLE_CSV,
  money,
  dateAt,
} from "@/lib/accounting";
export function download(name: string, text: string, type = "text/csv") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const blank = (): JournalRow => ({
  entry_date: "2026-01-01",
  account_code: "",
  account_name: "",
  account_type: "Asset",
  debit: 0,
  credit: 0,
  description: "",
  currency: "EUR",
});
export default function JournalWorkspace({
  batches,
  onAdd,
  onDelete,
  postings,
}: {
  batches: Batch[];
  onAdd: (entries: JournalRow[], name: string) => boolean;
  onDelete: (id: string) => void;
  postings: Posting[];
}) {
  const [rows, setRows] = useState<JournalRow[]>([blank(), blank()]);
  const [mode, setMode] = useState("batches");
  const [error, setError] = useState("");
  const file = useRef<HTMLInputElement>(null);
  function save(entries: JournalRow[], name: string) {
    const errors = validateJournal(entries);
    if (errors.length) {
      setError(errors.join("\n"));
      return;
    }
    if (!onAdd(entries, name)) return;
    setError("");
    setRows([blank(), blank()]);
    setMode("batches");
  }
  async function upload(f: File | undefined) {
    if (!f) return;
    try {
      if (f.size > 2_000_000) throw new Error("Use a CSV smaller than 2 MB.");
      save(journalFromCsv(await f.text()), f.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read CSV.");
    } finally {
      if (file.current) file.current.value = "";
    }
  }
  return (
    <section className="panel">
      <div className="toolbar">
        <div>
          <h2>Journal entries</h2>
          <p className="compact">
            Instrument postings are generated automatically. Add balanced
            adjustment batches in EUR.
          </p>
        </div>
        <div className="split">
          <button
            className="secondary"
            onClick={() => download("yuzu-journal-sample.csv", SAMPLE_CSV)}
          >
            Sample CSV
          </button>
          <button className="secondary" onClick={() => file.current?.click()}>
            Upload CSV
          </button>
          <input
            ref={file}
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={(e) => upload(e.target.files?.[0])}
          />
        </div>
      </div>
      <nav aria-label="Journal views">
        {["batches", "manual", "generated"].map((m) => (
          <button
            key={m}
            className={mode === m ? "active" : ""}
            onClick={() => setMode(m)}
          >
            {m === "batches"
              ? "Saved batches"
              : m === "manual"
                ? "Manual entry"
                : "Instrument postings"}
          </button>
        ))}
      </nav>
      {error && (
        <div
          className="notice error"
          role="alert"
          style={{ whiteSpace: "pre-line" }}
        >
          {error}
        </div>
      )}
      {mode === "manual" && (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {[
                    "Date",
                    "Code",
                    "Account",
                    "Type",
                    "Debit",
                    "Credit",
                    "Description",
                    "",
                  ].map((s, i) => (
                    <th key={i}>{s}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, index) => (
                  <tr key={index}>
                    {(
                      [
                        "entry_date",
                        "account_code",
                        "account_name",
                        "account_type",
                        "debit",
                        "credit",
                        "description",
                      ] as const
                    ).map((k) => (
                      <td key={k}>
                        {k === "account_type" ? (
                          <select
                            aria-label={`Row ${index + 1} account type`}
                            value={r[k]}
                            onChange={(e) =>
                              setRows(
                                rows.map((x, n) =>
                                  n === index
                                    ? {
                                        ...x,
                                        account_type: e.target
                                          .value as JournalRow["account_type"],
                                      }
                                    : x,
                                ),
                              )
                            }
                          >
                            {[
                              "Asset",
                              "Liability",
                              "Equity",
                              "Income",
                              "Expense",
                            ].map((t) => (
                              <option key={t}>{t}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            aria-label={`Row ${index + 1} ${k}`}
                            style={{
                              minWidth: k === "description" ? 170 : 100,
                            }}
                            type={
                              k === "entry_date"
                                ? "date"
                                : k === "debit" || k === "credit"
                                  ? "number"
                                  : "text"
                            }
                            step=".01"
                            min={
                              k === "debit" || k === "credit" ? 0 : undefined
                            }
                            value={r[k]}
                            onChange={(e) =>
                              setRows(
                                rows.map((x, n) =>
                                  n === index
                                    ? {
                                        ...x,
                                        [k]:
                                          k === "debit" || k === "credit"
                                            ? e.target.value === ""
                                              ? 0
                                              : Number(e.target.value)
                                            : e.target.value,
                                      }
                                    : x,
                                ),
                              )
                            }
                          />
                        )}
                      </td>
                    ))}
                    <td>
                      <button
                        className="secondary"
                        aria-label={`Remove row ${index + 1}`}
                        onClick={() =>
                          setRows(rows.filter((_, n) => n !== index))
                        }
                      >
                        ×
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
              onClick={() => setRows([...rows, blank()])}
            >
              Add row
            </button>
            <button onClick={() => save(rows, "Manual adjustment")}>
              Save batch
            </button>
          </div>
        </>
      )}
      {mode === "batches" && (
        <>
          {batches.length === 0 ? (
            <div className="empty">
              <h3>No adjustment batches yet</h3>
              <p>Upload a CSV or enter a balanced batch manually.</p>
              <button
                onClick={() =>
                  save(journalFromCsv(SAMPLE_CSV), "Sample equipment purchase")
                }
              >
                Try sample batch
              </button>
            </div>
          ) : (
            batches.map((b) => (
              <details key={b.id}>
                <summary>
                  {b.name} · {b.entries.length} rows ·{" "}
                  {new Date(b.createdAt).toLocaleString()}
                </summary>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Account</th>
                        <th>Type</th>
                        <th>Debit</th>
                        <th>Credit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {b.entries.map((e, k) => (
                        <tr key={k}>
                          <td>{e.entry_date}</td>
                          <td>
                            {e.account_code} · {e.account_name}
                          </td>
                          <td>{e.account_type}</td>
                          <td>{money(e.debit)}</td>
                          <td>{money(e.credit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button className="secondary" onClick={() => onDelete(b.id)}>
                  Remove batch
                </button>
              </details>
            ))
          )}
        </>
      )}
      {mode === "generated" && (
        <>
          <p className="compact">
            Cumulative snapshot postings through the reporting date. Interest
            and coupon lines aggregate monthly amounts; they are not a
            transaction-by-transaction history.
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>As of</th>
                  <th>Instrument</th>
                  <th>Posting</th>
                  <th>Account</th>
                  <th>Debit</th>
                  <th>Credit</th>
                </tr>
              </thead>
              <tbody>
                {postings.map((p, n) => (
                  <tr key={n}>
                    <td>{dateAt(p.month)}</td>
                    <td>{p.instrument}</td>
                    <td>{p.description}</td>
                    <td>{p.account.replace(/ \[.*\]$/, "")}</td>
                    <td className="money">
                      {p.amount > 0 ? money(p.amount) : "—"}
                    </td>
                    <td className="money">
                      {p.amount < 0 ? money(-p.amount) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
