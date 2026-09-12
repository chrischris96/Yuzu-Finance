"use client";
import { useEffect, useState } from "react";
import {
  Report,
  Entry,
  Group,
  groups,
  totals,
  descendants,
  validateLayout,
} from "@/lib/reporting";
import { money } from "@/lib/accounting";
import { download } from "./JournalWorkspace";

const key = "yuzu-management-layout-v1";
export default function StatementTree({
  report,
  onMitigate,
}: {
  report: Report;
  onMitigate?: (ids: string[]) => void;
}) {
  const [layout, setLayout] = useState<Group[]>(groups),
    [assign, setAssign] = useState<Record<string, string>>({}),
    [management, setManagement] = useState(false),
    [depth, setDepth] = useState(1),
    [open, setOpen] = useState<Record<string, boolean>>({}),
    [selection, setSelection] = useState<{
      name: string;
      ids: string[];
    } | null>(null),
    [edit, setEdit] = useState(false),
    [message, setMessage] = useState(""),
    [risk, setRisk] = useState(false),
    [groupId, setGroupId] = useState("ac"),
    [name, setName] = useState(""),
    [parent, setParent] = useState("A"),
    [account, setAccount] = useState(""),
    [target, setTarget] = useState("ac");
  useEffect(() => {
    try {
      const s = localStorage.getItem(key);
      if (s) {
        const parsed = JSON.parse(s);
        validateLayout(parsed.layout, parsed.assign);
        setLayout(parsed.layout);
        setAssign(parsed.assign);
      }
    } catch {
      setMessage(
        "Saved layout could not be read. The standard layout is shown; your saved data has not been overwritten.",
      );
    }
  }, []);
  // A later book can introduce a reporting category absent from an older saved layout.
  // Restore missing standard groups so newly introduced accounts never disappear.
  const active = management ? [...layout,...groups.filter(g=>!layout.some(x=>x.id===g.id))] : groups;
  const entries = report.entries.map((e) => ({
    ...e,
    group: management ? (assign[e.code] ?? e.group) : e.group,
  }));
  const accounts = [
    ...new Map(
      report.entries.map((e) => [
        e.code,
        { code: e.code, label: e.label, group: e.group },
      ]),
    ).values(),
  ];
  function save(next: Group[], mapping = assign) {
    try {
      validateLayout(next, mapping);
      for (const e of report.entries)
        if (!next.some((g) => g.id === (mapping[e.code] ?? e.group)))
          throw Error("Move every account out before removing its group.");
      localStorage.setItem(
        key,
        JSON.stringify({ version: 1, layout: next, assign: mapping }),
      );
      setLayout(next);
      setAssign(mapping);
      setMessage(
        "Management layout saved. Postings and IFRS mappings are unchanged.",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Layout could not be saved.");
    }
  }
  const selected = selection
    ? entries.filter((e) => selection.ids.includes(e.id))
    : [];
  const st = totals(selected, report.previous);
  const selectedDetails = report.details.filter((d) =>
    selected.some((e) => e.positionId === d.id),
  );
  function row(
    id: string,
    label: string,
    items: Entry[],
    level: number,
    children: () => React.ReactNode,
    hasChildren = true,
  ) {
    const t = totals(items, report.previous),
      expanded = open[id] ?? level < depth;
    const details = report.details.filter((d) =>
      items.some(
        (e) =>
          e.positionId === d.id && e.component === "Principal and valuation",
      ),
    );
    const measured = details.filter((d) => d.eve !== null),
      eve = measured.reduce((s, d) => s + d.eve!, 0);
    return (
      <div key={id} className="statement-node">
        <div className="statement-row" role="row">
          <div role="cell" style={{ paddingLeft: 12 + level * 18 }}>
            {hasChildren && (
              <button
                className="tree-toggle"
                aria-label={(expanded ? "Collapse " : "Expand ") + label}
                aria-expanded={expanded}
                onClick={() => setOpen({ ...open, [id]: !expanded })}
              >
                {expanded ? "−" : "+"}
              </button>
            )}
            <button
              className="tree-label"
              onClick={() =>
                setSelection({ name: label, ids: items.map((e) => e.id) })
              }
            >
              {label}
            </button>
          </div>
          <span role="cell">{money(t.opening)}</span>
          <span role="cell">{money(t.debit)}</span>
          <span role="cell">{money(t.credit)}</span>
          <strong role="cell">{money(t.closing)}</strong>
          {risk && (
            <span
              role="cell"
              className={
                measured.length
                  ? eve < 0
                    ? "risk-adverse"
                    : "risk-favourable"
                  : "risk-unavailable"
              }
            >
              {measured.length ? money(eve) : "Not modelled"}
              <small>
                {measured.length}/{details.length} positions ·{" "}
                {!measured.length
                  ? "coverage unavailable"
                  : eve < 0
                    ? "adverse"
                    : eve > 0
                      ? "favourable"
                      : "neutral"}
              </small>
            </span>
          )}
        </div>
        {expanded && children()}
      </div>
    );
  }
  function renderGroup(g: Group, level: number): React.ReactNode {
    const ids = descendants(active, g.id),
      items = entries.filter((e) => ids.includes(e.group));
    return row("group:" + g.id, g.name, items, level, () => (
      <>
        {active
          .filter((x) => x.parent === g.id)
          .sort((a, b) => a.order - b.order)
          .map((x) => renderGroup(x, level + 1))}
        {accounts
          .filter((a) =>
            items.some((e) => e.group === g.id && e.code === a.code),
          )
          .map((a) => {
            const gl = entries.filter(
              (e) => e.group === g.id && e.code === a.code,
            );
            return row(a.code, a.label + " · " + a.code, gl, level + 1, () =>
              [...new Set(gl.map((e) => e.positionId))].map((pid) => {
                const sub = gl.filter((e) => e.positionId === pid),
                  label =
                    report.details.find((d) => d.id === pid)?.name ??
                    "Bank / manual postings";
                return row(a.code + ":" + pid, label, sub, level + 2, () => (
                  <div className="tree-postings">
                    {sub.map((e) => (
                      <button
                        key={e.id}
                        onClick={() =>
                          setSelection({ name: e.event, ids: [e.id] })
                        }
                      >
                        {e.date} · {e.event} · {e.amount >= 0 ? "Dr" : "Cr"}{" "}
                        {money(Math.abs(e.amount))}
                      </button>
                    ))}
                  </div>
                ));
              }),
            );
          })}
      </>
    ));
  }
  return (
    <section className="panel statement-tree">
      <div className="toolbar">
        <div>
          <p className="eyebrow">
            BANK STATEMENT ·{" "}
            {management ? "MANAGEMENT LAYOUT" : "IFRS REPORTING LAYOUT"}
          </p>
          <h2>Balance sheet & linked ledgers</h2>
          <p>
            {report.date} · opening comparison {report.previous}
          </p>
        </div>
        <button
          className="secondary"
          onClick={() =>
            download(
              "yuzu-statement.json",
              JSON.stringify(
                { report, layout: active, assign: management ? assign : {} },
                null,
                2,
              ),
              "application/json",
            )
          }
        >
          Export statement & trace
        </button>
      </div>
      <p className="muted">
        Signed ledger balances: debit positive, credit negative. Liabilities and
        equity normally carry credit balances. Debits and credits are period
        movements; they are never netted. Current-period P&L rolls into equity.
        Opening balances use the current grouping, including current
        asset/liability presentation; they are not a reproduction of a
        previously published statement.
      </p>
      <div className="toolbar">
        <label>
          Layout
          <select
            value={management ? "management" : "ifrs"}
            onChange={(e) => {
              setManagement(e.target.value === "management");
              setSelection(null);
            }}
          >
            <option value="ifrs">IFRS reporting · controlled</option>
            <option value="management">Management · editable</option>
          </select>
        </label>
        <label>
          Expand to depth
          <select
            value={depth}
            onChange={(e) => {
              setDepth(Number(e.target.value));
              setOpen({});
            }}
          >
            {[0, 1, 2, 3, 4, 5, 9].map((n) => (
              <option key={n} value={n}>
                {n === 9 ? "All levels" : n}
              </option>
            ))}
          </select>
        </label>
        <button
          className="secondary"
          onClick={() => {
            setDepth(0);
            setOpen({});
          }}
        >
          Collapse all
        </button>
        <button
          className="secondary"
          onClick={() => {
            setDepth(9);
            setOpen({});
          }}
        >
          Expand all
        </button>
        {management && (
          <button className="secondary" onClick={() => setEdit(!edit)}>
            Edit layout
          </button>
        )}
        {report.risk && (
          <label>
            <input
              type="checkbox"
              checked={risk}
              onChange={(e) => setRisk(e.target.checked)}
            />{" "}
            Show risk contribution
          </label>
        )}
      </div>
      {edit && management && (
        <div className="layout-editor">
          <h3>Manage groups and account mappings</h3>
          <p>
            Use the management view for alternative organisation. Missing or
            duplicated accounts and cyclic groups are rejected. Zero rows are
            retained; a zero does not prove model coverage.
          </p>
          <div className="form-grid">
            <label>
              Existing group
              <select
                value={groupId}
                onChange={(e) => {
                  const g = layout.find((g) => g.id === e.target.value)!;
                  setGroupId(g.id);
                  setName(g.name);
                  setParent(g.parent ?? "A");
                }}
              >
                {layout.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Group name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
              />
            </label>
            <label>
              Parent group
              <select
                value={parent}
                onChange={(e) => setParent(e.target.value)}
              >
                {layout.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="toolbar">
            <button
              onClick={() =>
                save([
                  ...layout,
                  {
                    id: "custom-" + crypto.randomUUID(),
                    name,
                    parent,
                    order: layout.length,
                  },
                ])
              }
            >
              Add group
            </button>
            <button
              className="secondary"
              disabled={["A", "L", "E"].includes(groupId)}
              onClick={() =>
                save(
                  layout.map((g) =>
                    g.id === groupId ? { ...g, name, parent } : g,
                  ),
                )
              }
            >
              Rename / move group
            </button>
            <button
              className="secondary"
              onClick={() => {
                const sorted = layout
                    .filter(
                      (g) =>
                        g.parent ===
                        layout.find((x) => x.id === groupId)?.parent,
                    )
                    .sort((a, b) => a.order - b.order),
                  i = sorted.findIndex((g) => g.id === groupId);
                if (i > 0)
                  save(
                    layout.map((g) =>
                      g.id === groupId
                        ? { ...g, order: sorted[i - 1].order }
                        : g.id === sorted[i - 1].id
                          ? { ...g, order: sorted[i].order }
                          : g,
                    ),
                  );
              }}
            >
              Move group up
            </button>
            <button
              className="secondary"
              disabled={["A", "L", "E"].includes(groupId)}
              onClick={() => save(layout.filter((g) => g.id !== groupId))}
            >
              Remove empty group
            </button>
          </div>
          <div className="form-grid">
            <label>
              General-ledger account
              <select
                value={account}
                onChange={(e) => setAccount(e.target.value)}
              >
                <option value="">Choose account</option>
                {accounts.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.label} · {a.code}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Assign to group
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              >
                {layout.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              disabled={!account}
              onClick={() => save(layout, { ...assign, [account]: target })}
            >
              Move account
            </button>
          </div>
          <button className="secondary" onClick={() => save(groups, {})}>
            Restore standard layout
          </button>
        </div>
      )}
      {message && <p role="status">{message}</p>}
      <div className="table-scroll">
        <div
          role="table"
          aria-label="Expandable bank balance sheet"
          className={risk ? "statement-grid with-risk" : "statement-grid"}
        >
          <div className="statement-row statement-head" role="row">
            <strong role="columnheader">Group / account / instrument</strong>
            <strong role="columnheader">Opening</strong>
            <strong role="columnheader">Debits</strong>
            <strong role="columnheader">Credits</strong>
            <strong role="columnheader">Closing</strong>
            {risk && <strong role="columnheader">ΔEVE · covered subset</strong>}
          </div>
          {active
            .filter((g) => g.parent === null)
            .sort((a, b) => a.order - b.order)
            .map((g) => renderGroup(g, 0))}
        </div>
      </div>
      <div className="notice">
        Ledger equation difference: {money(report.difference)} ·{" "}
        {report.subledgerDifference === null
          ? "Instrument demo; no independent risk subledger check"
          : "Subledger difference: " + money(report.subledgerDifference)}
        . Risk values describe the selected saved scenario at inception, not
        accounting postings. Group risk deduplicates instruments; account-level
        risk is contextual and must not be summed across principal, accrual and
        allowance accounts.
      </div>
      {report.issues.length > 0 && (
        <details>
          <summary>Coverage / mapping review ({report.issues.length})</summary>
          <ul>
            {report.issues.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </details>
      )}
      <details>
        <summary>Source and saved-run reference</summary>
        <p>{report.source}</p>
        <p className="trace-id">{report.id}</p>
        <p>
          Bank-oriented presentation inspired by{" "}
          <a
            href="https://investor-relations.db.com/files/documents/other-presentations-and-events/2025/Annual-Report-2025.pdf?language_id=1#page=459"
            target="_blank"
            rel="noreferrer"
          >
            Deutsche Bank’s 2025 statement
          </a>
          . This template is not a complete set of IFRS financial statements.
          Tax, goodwill and other unsupported activities are not simulated.
        </p>
      </details>
      {selection && (
        <aside className="ledger-detail">
          <div className="toolbar">
            <h3>{selection.name}</h3>
            <button className="secondary" onClick={() => setSelection(null)}>
              Close detail
            </button>
          </div>
          <p>
            Opening {money(st.opening)} → transactions {money(st.transactions)}{" "}
            → accruals {money(st.accruals)} → valuation {money(st.valuation)} →
            impairment {money(st.impairment)} → other/manual {money(st.other)} →
            closing {money(st.closing)}. Reconciliation difference{" "}
            {money(st.difference)}.
          </p>
          <div className="movement-bars" aria-label="Movement reconciliation">
            {(
              [
                "transactions",
                "accruals",
                "valuation",
                "impairment",
                "other",
              ] as const
            ).map((k) => (
              <div key={k}>
                <span>{k}</span>
                <meter
                  min={0}
                  max={Math.max(
                    1,
                    ...[
                      st.transactions,
                      st.accruals,
                      st.valuation,
                      st.impairment,
                      st.other,
                    ].map(Math.abs),
                  )}
                  value={Math.abs(st[k])}
                />
                <strong>{money(st[k])}</strong>
              </div>
            ))}
          </div>
          {onMitigate && (
            <button
              onClick={() => onMitigate(selectedDetails.map((d) => d.id))}
            >
              Test mitigation for this exposure
            </button>
          )}
          {selectedDetails.map((d) => (
            <details key={d.id}>
              <summary>
                {d.name} · {d.category}
              </summary>
              <p>{d.rationale}</p>
              <p>
                Maturity {d.maturity}. {d.repricing}
              </p>
              <p>
                Carrying amount{" "}
                {d.carrying === null ? "Unavailable" : money(d.carrying)} · fair
                value {d.fair === null ? "Unavailable" : money(d.fair)} ·
                cumulative P&L{" "}
                {d.pnl === null
                  ? "See linked income/expense postings"
                  : money(d.pnl)}{" "}
                · cumulative OCI{" "}
                {d.oci === null ? "See linked equity postings" : money(d.oci)}
              </p>
              <p>
                ΔEVE {d.eve === null ? "Not modelled" : money(d.eve)} · ΔNII{" "}
                {d.nii === null ? "Not modelled" : money(d.nii)} · {d.coverage}
              </p>
              <p>
                Source: {d.source} · instrument ID {d.id}
              </p>
              <button
                className="secondary"
                onClick={() =>
                  setSelection({
                    name: d.name + " · all linked postings",
                    ids: entries
                      .filter((e) => e.positionId === d.id)
                      .map((e) => e.id),
                  })
                }
              >
                Show all instrument postings including P&amp;L and OCI
              </button>
            </details>
          ))}
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Event</th>
                  <th>Account</th>
                  <th>Debit</th>
                  <th>Credit</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {selected.map((e) => (
                  <tr key={e.id}>
                    <td>{e.date}</td>
                    <td>{e.event}</td>
                    <td>{e.original}</td>
                    <td>{money(Math.max(0, e.amount))}</td>
                    <td>{money(Math.max(0, -e.amount))}</td>
                    <td>{e.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </aside>
      )}
    </section>
  );
}
