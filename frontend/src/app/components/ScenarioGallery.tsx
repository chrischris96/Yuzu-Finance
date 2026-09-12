"use client";
import { useMemo, useState } from "react";
import {
  Model,
  sampleBook,
  sampleCurve,
  runStress,
  zeroRate,
  shockBp,
} from "@/lib/bank-book";
import { money } from "@/lib/accounting";
import {
  learningModels,
  learningSetups as setups,
} from "@/lib/learning-scenarios";
import StressPlot from "./StressPlot";
const BIS =
  "https://www.bis.org/committees/bcbs/basel-framework/standard/srp/98/inforce/2026-01-01/published/2024-07-16";
const PRINCIPLES =
  "https://www.bis.org/committees/bcbs/basel-consolidated-guidelines/module/rma/30";
export default function ScenarioGallery({
  onLoad,
}: {
  onLoad: (model: Model) => void;
}) {
  const [selected, setSelected] = useState(0);
  const models = useMemo(learningModels, []);
  const results = useMemo(
    () =>
      models.map((model) =>
        runStress({
          book: sampleBook(),
          curve: sampleCurve(),
          model,
          horizonMonths: 12,
          snapshotHash: "",
        }),
      ),
    [models],
  );
  const result = results[selected],
    setup = setups[selected],
    curve = sampleCurve();
  const tenors = [0, 0.25, 0.5, 1, 2, 3, 5, 10];
  const curves = [
    {
      name: "Observed example curve",
      color: "#87948a",
      values: tenors.map((t) => zeroRate(curve, t) * 100),
    },
    ...models.map((m, n) => ({
      name: m.name,
      color: setups[n].color,
      values: tenors.map(
        (t) => (zeroRate(curve, t) + shockBp(m, t) / 10000) * 100,
      ),
    })),
  ];
  const low = Math.min(0, ...curves.flatMap((c) => c.values)),
    high = Math.max(...curves.flatMap((c) => c.values)),
    range = high - low || 1;
  const x = (t: number) => 55 + (t / 10) * 620,
    y = (v: number) => 230 - ((v - low) / range) * 185;
  const interest = (r: typeof result, stress: boolean, k: number) =>
    r.positions
      .filter((p) => p.regulatoryBook === "banking")
      .reduce(
        (s, p) => s + ((stress ? p.stressed : p.baseline)?.[k]?.interest ?? 0),
        0,
      );
  return (
    <section className="scenario-gallery">
      <div className="gallery-intro">
        <p className="eyebrow">NO INPUT REQUIRED · FICTIONAL EXAMPLE BANK</p>
        <h2>Three shocks. One bank. Different stories.</h2>
        <p>
          Explore three model setups using the same cash-flow engine, with
          different rate and deposit assumptions. They are illustrative
          sensitivities, not three independently validated models or prescribed
          BIS shocks.
        </p>
      </div>
      <div className="scenario-cards">
        {setups.map((s, n) => (
          <button
            key={s.name}
            className={`scenario-card ${selected === n ? "selected" : ""}`}
            onClick={() => setSelected(n)}
            aria-pressed={selected === n}
            style={{ borderTopColor: s.color }}
          >
            <small>SETUP {n + 1}</small>
            <h3>{s.name}</h3>
            <p>{s.description}</p>
            <dl>
              <dt>Full-life ΔEVE</dt>
              <dd>{money(results[n].metrics.eveDelta ?? 0)}</dd>
              <dt>12-month ΔNII</dt>
              <dd>
                {results[n].metrics.niiDelta === null
                  ? "Incomplete"
                  : money(results[n].metrics.niiDelta!)}
              </dd>
              <dt>Minimum settlement cash</dt>
              <dd>
                {results[n].metrics.minimumProjectedCash === null
                  ? "Incomplete"
                  : money(results[n].metrics.minimumProjectedCash!)}
              </dd>
            </dl>
          </button>
        ))}
      </div>
      <section className="panel">
        <h3>See the rate shocks</h3>
        <p>
          Zero rate (%) against maturity in years. Spread, withdrawal and PD
          shocks are separate and appear in the table below.
        </p>
        <svg
          className="shock-chart"
          viewBox="0 0 720 275"
          role="img"
          aria-label="Baseline and three shocked yield curves, exact values in the following table"
        >
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <g key={f}>
              <line
                x1="55"
                x2="675"
                y1={y(low + f * range)}
                y2={y(low + f * range)}
                stroke="#d9e1d8"
              />
              <text
                x="45"
                y={y(low + f * range) + 4}
                textAnchor="end"
                fontSize="12"
              >
                {(low + f * range).toFixed(1)}%
              </text>
            </g>
          ))}
          {[0, 1, 2, 3, 5, 10].map((t) => (
            <text key={t} x={x(t)} y="255" textAnchor="middle" fontSize="12">
              {t}y
            </text>
          ))}
          {curves.map((c) => (
            <polyline
              key={c.name}
              fill="none"
              stroke={c.color}
              strokeWidth="3"
              strokeDasharray={
                c.name === "Observed example curve" ? "5 5" : undefined
              }
              points={c.values
                .map((v, k) => `${x(tenors[k])},${y(v)}`)
                .join(" ")}
            />
          ))}
        </svg>
        <div className="curve-legend">
          {curves.map((c) => (
            <span key={c.name}>
              <i style={{ background: c.color }} />
              {c.name}
            </span>
          ))}
        </div>
        <details>
          <summary>Exact curve values and model assumptions</summary>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tenor</th>
                  {curves.map((c) => (
                    <th key={c.name}>{c.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tenors.map((t, k) => (
                  <tr key={t}>
                    <td>{t} years</td>
                    {curves.map((c) => (
                      <td key={c.name}>{c.values[k].toFixed(3)}%</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <table>
              <thead>
                <tr>
                  <th>Assumption</th>
                  {models.map((m) => (
                    <th key={m.id}>{m.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    "parallelBp",
                    "shortBp",
                    "longBp",
                    "spreadBp",
                    "depositBeta",
                    "depositLifeMonths",
                    "runoffPct",
                    "pdMultiplier",
                  ] as const
                ).map((key, k) => (
                  <tr key={key}>
                    <td>
                      {
                        [
                          "Parallel shock (bp)",
                          "Short shock (bp)",
                          "Long shock (bp)",
                          "Credit spread (bp)",
                          "Deposit beta",
                          "Deposit life (months)",
                          "Withdrawal fraction",
                          "PD multiplier",
                        ][k]
                      }
                    </td>
                    {models.map((m) => (
                      <td key={m.id}>{m.parameters[key]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>
      <section className="panel story-panel">
        <p className="eyebrow">{setup.name.toUpperCase()} · READ THE RESULT</p>
        <h2>{setup.title}</h2>
        <p>{setup.why}</p>
        <div className="notice">
          <strong>BIS lens</strong>
          <p>
            {setup.lens} These explanations apply BIS concepts to this fictional
            model; BIS has not evaluated these results.
          </p>
          <a href={BIS} target="_blank" rel="noopener noreferrer">
            IRRBB guidance ↗
          </a>
          {selected === 2 && (
            <>
              {" "}
              ·{" "}
              <a href={PRINCIPLES} target="_blank" rel="noopener noreferrer">
                Stress-testing principles ↗
              </a>
            </>
          )}
        </div>
        <p>
          Each change is measured against that setup’s own baseline. Funding
          squeeze changes baseline deposit life as well as the stress: compare
          the assumptions before comparing the totals.
        </p>
        <div className="chart-grid">
          <StressPlot
            title={`${setup.name}: cumulative banking interest`}
            dates={result.dates}
            selected={12}
            lines={[
              {
                name: "Baseline",
                color: "#87948a",
                values: result.dates.map((_, k) => interest(result, false, k)),
              },
              {
                name: "Stress",
                color: setup.color,
                values: result.dates.map((_, k) => interest(result, true, k)),
              },
            ]}
          />
          <StressPlot
            title={`${setup.name}: settlement cash`}
            dates={result.dates}
            selected={12}
            lines={[
              {
                name: "Baseline cash",
                color: "#87948a",
                values: result.statements.map((p) => p.baseline.cash),
              },
              {
                name: "Stress cash",
                color: setup.color,
                values: result.statements.map((p) => p.stress.cash),
              },
            ]}
          />
        </div>
        <details>
          <summary>Monthly interest and cash values</summary>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Baseline interest</th>
                  <th>Stress interest</th>
                  <th>Baseline cash</th>
                  <th>Stress cash</th>
                </tr>
              </thead>
              <tbody>
                {result.statements.map((s, k) => (
                  <tr key={s.date}>
                    <td>{s.date}</td>
                    <td>{money(interest(result, false, k))}</td>
                    <td>{money(interest(result, true, k))}</td>
                    <td>{money(s.baseline.cash)}</td>
                    <td>{money(s.stress.cash)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
        <h3>Where the economic-value change comes from</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Position</th>
                <th>Baseline value</th>
                <th>Stressed value</th>
                <th>Change</th>
              </tr>
            </thead>
            <tbody>
              {result.positions.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{money(p.baseline?.[0].pv ?? 0)}</td>
                  <td>{money(p.stressed?.[0].pv ?? 0)}</td>
                  <td>
                    {money(
                      (p.stressed?.[0].pv ?? 0) - (p.baseline?.[0].pv ?? 0),
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          All monthly accounting and subledger differences are €0.00 in these
          examples. EVE is economic value; it is not accounting equity or
          regulatory capital. Credit losses use the lab’s stated proxy.
        </p>
        <button onClick={() => onLoad(structuredClone(models[selected]))}>
          Load this example + setup into my draft
        </button>
        <p className="compact">
          Replaces editable book and curve with the fictional example. Saved
          runs and the original accounting demo are preserved. You can then edit
          assumptions and save a full reproducible run.
        </p>
      </section>
    </section>
  );
}
