"use client";
import { useMemo, useState } from "react";
import {
  Instrument,
  samplePortfolio,
  PRODUCTS,
  money,
  dateAt,
  classify,
  rationale,
  portfolio,
  isDerivative,
} from "@/lib/accounting";
import {
  Measurement,
  series,
  available,
  scenarioNote,
  debtComparison,
} from "@/lib/comparison";
import TimeChart from "./TimeChart";
import { download } from "./JournalWorkspace";
const colors = {
  pnl: "#216c55",
  oci: "#9b4fbb",
  market: "#c66b25",
  carrying: "#2458a6",
  interest: "#548b26",
};
const categories: Measurement[] = ["FVTPL", "FVOCI", "Amortised cost"];
export default function ComparisonWorkspace({
  instruments,
  month,
}: {
  instruments: Instrument[];
  month: number;
}) {
  const [source, setSource] = useState("examples");
  const [product, setProduct] = useState("All");
  const [selected, setSelected] = useState("sample-bond-oci");
  const [experiment, setExperiment] = useState(false);
  const examples = useMemo(samplePortfolio, []);
  const choices = (source === "examples" ? examples : instruments).filter(
    (i) => product === "All" || i.product === product,
  );
  const i = choices.find((i) => i.id === selected) || choices[0];
  const data = useMemo(
    () =>
      i
        ? categories.map((category) => ({
            category,
            points: series(i, category),
            enabled: available(i, category) || experiment,
          }))
        : [],
    [i, experiment],
  );
  const common = data
    .filter((d) => d.enabled && d.category !== "Amortised cost")
    .flatMap((d) => d.points.flatMap((p) => [p.pnl, p.oci, p.comprehensive]));
  const range: [number, number] = [
    Math.min(0, ...common),
    Math.max(0, ...common),
  ];
  const actualCategory = i ? classify(i) : "Review required";
  const actual =
    i && actualCategory !== "Review required"
      ? series(i, actualCategory)
      : null;
  return (
    <div className="comparison-workspace">
      <section className="panel">
        <p className="eyebrow">EXPLORE THE EXAMPLE LIBRARY</p>
        <h2>Same instrument. Different paths to earnings.</h2>
        <p>
          Browse 16 fictional positions across all nine product types, or
          inspect your own book. These comparisons do not change your saved
          portfolio.
        </p>
        <div className="form-grid">
          <label>
            Data source
            <select value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="examples">Example library · 16 positions</option>
              <option value="book">My bank portfolio</option>
            </select>
          </label>
          <label>
            Product family
            <select
              value={product}
              onChange={(e) => setProduct(e.target.value)}
            >
              <option>All</option>
              {PRODUCTS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label className="full">
            Instrument
            <select
              value={i?.id || ""}
              onChange={(e) => {
                setSelected(e.target.value);
                setExperiment(false);
              }}
            >
              {choices.map((i) => (
                <option value={i.id} key={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {!i && (
          <p className="empty">
            No matching instruments. Choose another product or browse the
            example library.
          </p>
        )}
        {i && (
          <>
            <div className="split">
              <span className="tag">{i.product}</span>
              <span className="tag">Current book: {actualCategory}</span>
              <span className="tag">
                {isDerivative(i.product)
                  ? "Valuation only"
                  : i.product === "Cash"
                    ? "Face value"
                    : `Interest paid every ${i.paymentFrequency ?? 1} month(s)`}
              </span>
            </div>
            <p>{rationale(i)}</p>
            <p className="notice">
              FVTPL = fair value through profit or loss. FVOCI = fair value
              through other comprehensive income. The total result can be
              identical while its split between P&L and the equity reserve
              differs. Debt comparisons assume the required SPPI result and
              business model at inception; they are not a switch you can elect
              for an existing position.
            </p>
            {!debtComparison(i) && (
              <label className="check">
                <input
                  type="checkbox"
                  checked={experiment}
                  onChange={(e) => setExperiment(e.target.checked)}
                />
                <span>
                  Show non-IFRS routing experiments for unavailable categories.
                  <small className="muted" style={{ display: "block" }}>
                    For derivatives, moving gains into OCI here is arithmetic
                    only, not hedge accounting. Ordinary funding and cash have
                    no FVOCI debt designation in this model.
                  </small>
                </span>
              </label>
            )}
            {isDerivative(i.product) && (
              <p className="compact">
                Fair values are supplied in EUR. Swap legs, CDS premiums, CFD
                settlements, exercise and currency cash flows are not simulated;
                accrual and payment figures therefore remain zero. Option
                opening values represent paid or received premiums.
              </p>
            )}
          </>
        )}
      </section>
      {i && (
        <>
          <div className="scenario-grid">
            {data.map(({ category, points, enabled }) => {
              const p = points[month];
              return (
                <section
                  className={`panel scenario-card ${category === "FVOCI" ? "oci-card" : ""}`}
                  key={category}
                >
                  <p className="eyebrow">
                    {category === "Amortised cost"
                      ? "REFERENCE MEASUREMENT"
                      : "FAIR VALUE MEASUREMENT"}
                  </p>
                  <h2>{category}</h2>
                  <p className="scenario-note">{scenarioNote(i, category)}</p>
                  {enabled ? (
                    <>
                      <small>At {dateAt(month)}</small>
                      <div className="headline-number">{money(p.carrying)}</div>
                      <small>Book value, including accrued interest</small>
                      {[
                        ["Accrued interest", p.accrued],
                        ["Cumulative P&L", p.pnl],
                        ["FVOCI reserve", p.oci],
                        ["Total comprehensive income", p.comprehensive],
                        ["ECL allowance / OCI offset", p.allowance],
                      ].map(([label, value]) => (
                        <div className="row" key={label}>
                          <span>{label}</span>
                          <strong className="money">
                            {money(Number(value))}
                          </strong>
                        </div>
                      ))}
                    </>
                  ) : (
                    <p className="empty">
                      Unavailable under the supported IFRS treatment. Enable the
                      labelled experiment to inspect the arithmetic.
                    </p>
                  )}
                </section>
              );
            })}
          </div>
          <div className="columns">
            {data
              .filter((d) => d.category !== "Amortised cost")
              .map((d) => (
                <section className="panel" key={d.category}>
                  {d.enabled ? (
                    <TimeChart
                      title={`${d.category} · where the result lands`}
                      description="Cumulative P&L, OCI reserve and their total. Both panels use the same scale."
                      month={month}
                      range={range}
                      lines={[
                        {
                          label: "P&L",
                          color: colors.pnl,
                          values: d.points.map((p) => p.pnl),
                        },
                        {
                          label: "OCI reserve",
                          color: colors.oci,
                          values: d.points.map((p) => p.oci),
                        },
                        {
                          label: "Total comprehensive income",
                          color: "#183f37",
                          dashed: true,
                          values: d.points.map((p) => p.comprehensive),
                        },
                      ]}
                    />
                  ) : (
                    <>
                      <h3>{d.category}</h3>
                      <p>
                        Comparison unavailable for this product under the
                        supported IFRS treatment.
                      </p>
                    </>
                  )}
                </section>
              ))}
          </div>
          <div className="columns">
            <section className="panel">
              <TimeChart
                title="Book value meets market value"
                description="Signed EUR values; liabilities are negative. Market value includes accrued interest. Overlapping fair-value lines are expected."
                month={month}
                lines={[
                  {
                    label: "Market value",
                    color: colors.market,
                    values: data[0].points.map((p) => p.market),
                  },
                  ...data
                    .filter((d) => d.enabled)
                    .map((d, k) => ({
                      label: d.category + " book value",
                      color: ["#216c55", "#9b4fbb", "#2458a6"][k],
                      dashed: true,
                      values: d.points.map((p) => p.carrying),
                    })),
                ]}
              />
            </section>
            <section className="panel">
              <TimeChart
                title="Accrual builds, then cash settles"
                description="Unpaid contractual interest versus each month’s coupon and principal cash flow; receipts positive, payments negative."
                month={month}
                bars
                lines={[
                  {
                    label: "Accrued interest balance",
                    color: colors.carrying,
                    values: data[0].points.map((p) => p.accrued),
                  },
                  {
                    label: "Interest cash flow",
                    color: colors.interest,
                    values: data[0].points.map(
                      (p, m) =>
                        p.coupons - (m ? data[0].points[m - 1].coupons : 0),
                    ),
                  },
                  {
                    label: "Principal cash flow",
                    color: colors.market,
                    values: data[0].points.map(
                      (p, m) =>
                        p.redemption -
                        (m ? data[0].points[m - 1].redemption : 0),
                    ),
                  },
                ]}
              />
            </section>
          </div>
          <section className="panel">
            <h2>Follow every month</h2>
            <p>
              Amounts are cumulative unless labelled “balance.” Market and book
              values include accrued interest. An FVOCI reserve is an equity
              balance, not a second asset. At contractual redemption, the
              instrument and its reserve clear. A sale before maturity is
              outside this scenario.
            </p>
            <button
              className="secondary"
              onClick={() =>
                download(
                  "yuzu-comparison.csv",
                  [
                    "scenario,date,book_value,market_value,accrued_interest,cumulative_interest,cumulative_coupons,cumulative_redemption,pnl,oci,total_comprehensive_income",
                    ...data
                      .filter((d) => d.enabled)
                      .flatMap((d) =>
                        d.points.map((p) =>
                          [
                            d.category +
                              (available(i, d.category)
                                ? ""
                                : " (non-IFRS experiment)"),
                            dateAt(p.month),
                            p.carrying,
                            p.market,
                            p.accrued,
                            p.interest,
                            p.coupons,
                            p.redemption,
                            p.pnl,
                            p.oci,
                            p.comprehensive,
                          ].join(","),
                        ),
                      ),
                  ].join("\n"),
                  "text/csv",
                )
              }
            >
              Download monthly comparison
            </button>
            {data
              .filter((d) => d.enabled)
              .map((d) => (
                <details
                  key={d.category}
                  open={d.category !== "Amortised cost"}
                >
                  <summary>
                    {d.category} · {scenarioNote(i, d.category)}
                  </summary>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          {[
                            "Date",
                            "Book value",
                            "Market value",
                            "Accrued balance",
                            "Interest accrued",
                            "Interest paid",
                            "Principal paid",
                            "P&L",
                            "OCI reserve",
                            "Total result",
                          ].map((h) => (
                            <th key={h}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {d.points.map((p) => (
                          <tr
                            key={p.month}
                            className={
                              p.month === month ? "selected-month" : ""
                            }
                          >
                            <th>{dateAt(p.month)}</th>
                            {[
                              p.carrying,
                              p.market,
                              p.accrued,
                              p.interest,
                              p.coupons,
                              p.redemption,
                              p.pnl,
                              p.oci,
                              p.comprehensive,
                            ].map((v, k) => (
                              <td key={k} className="money">
                                {money(v)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              ))}
          </section>
          {actual && (
            <section className="panel">
              <h2>Double-entry trail · {actualCategory}</h2>
              <p>
                Actual book treatment only, for the selected month. Positive
                amounts in the charts are gains or receipts; the journal uses
                debit and credit columns.
              </p>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>Account</th>
                      <th>Debit</th>
                      <th>Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio([i], [], month)
                      .instrumentPostings.filter(
                        (p) => p.instrument === i.name && p.month === month,
                      )
                      .map((p, k) => (
                        <tr key={k}>
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
              <p className="compact">
                Each event consists of equal debit and credit amounts. Select
                another reporting month to inspect that period’s entries.
              </p>
            </section>
          )}
          <section className="panel">
            <h2>Compare the entire example bank</h2>
            <p>
              Common-scale overview at {dateAt(month)}. Both columns use the
              same position inputs. Unavailable means no FVOCI debt treatment is
              supported; use the instrument experiment above to explore an
              alternative allocation.
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Example</th>
                    <th>Book treatment</th>
                    <th>FVTPL P&L / OCI</th>
                    <th>FVOCI P&L / OCI</th>
                    <th>Explore</th>
                  </tr>
                </thead>
                <tbody>
                  {examples.map((e) => {
                    const pl = series(e, "FVTPL")[month],
                      oc = series(e, "FVOCI")[month];
                    return (
                      <tr key={e.id}>
                        <td>{e.name}</td>
                        <td>{classify(e)}</td>
                        <td>
                          {available(e, "FVTPL")
                            ? `${money(pl.pnl)} / ${money(pl.oci)}`
                            : "Unavailable"}
                        </td>
                        <td>
                          {available(e, "FVOCI")
                            ? `${money(oc.pnl)} / ${money(oc.oci)}`
                            : "Unavailable"}
                        </td>
                        <td>
                          <button
                            className="secondary"
                            onClick={() => {
                              setSource("examples");
                              setProduct("All");
                              setSelected(e.id);
                              setExperiment(false);
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
