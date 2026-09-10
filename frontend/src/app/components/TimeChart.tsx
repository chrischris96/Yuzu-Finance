import { useId } from "react";
export type ChartSeries = {
  label: string;
  color: string;
  values: number[];
  dashed?: boolean;
};
export default function TimeChart({
  title,
  description,
  lines,
  month,
  range,
  bars = false,
}: {
  title: string;
  description: string;
  lines: ChartSeries[];
  month: number;
  range?: [number, number];
  bars?: boolean;
}) {
  const id = useId();
  const values = lines.flatMap((l) => l.values);
  const low = range?.[0] ?? Math.min(0, ...values),
    high = range?.[1] ?? Math.max(0, ...values);
  const span = high - low || 1;
  const min = low - span * 0.06,
    max = high + span * 0.06;
  const x = (m: number) => 64 + m * 37,
    y = (v: number) => 230 - ((v - min) / (max - min)) * 198;
  const tick = (v: number) =>
    new Intl.NumberFormat("en", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(v);
  return (
    <figure className="time-chart">
      <figcaption>
        <h3 id={id}>{title}</h3>
        <p>{description}</p>
      </figcaption>
      <svg
        viewBox="0 0 550 275"
        role="img"
        aria-labelledby={id}
        aria-describedby={`${id}-desc`}
      >
        <desc id={`${id}-desc`}>
          EUR, January 2026 to January 2027.{" "}
          {lines
            .map(
              (l) =>
                `${l.label}: opening ${l.values[0]}, selected ${l.values[month]}, ending ${l.values[12]}`,
            )
            .join(". ")}
          . Exact monthly values are in the table below.
        </desc>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const v = low + (high - low) * t;
          return (
            <g key={t}>
              <line x1="64" x2="508" y1={y(v)} y2={y(v)} stroke="#d9e1d8" />
              <text
                x="55"
                y={y(v) + 4}
                textAnchor="end"
                fontSize="11"
                fill="#5e7069"
              >
                {tick(v)}
              </text>
            </g>
          );
        })}
        <line x1="64" x2="508" y1={y(0)} y2={y(0)} stroke="#75877c" />
        <line
          x1={x(month)}
          x2={x(month)}
          y1="22"
          y2="237"
          stroke="#75877c"
          strokeDasharray="3 4"
        />
        <text x="12" y="17" fontSize="11" fill="#5e7069">
          EUR
        </text>
        {lines.map((l, k) => (
          <g key={l.label}>
            {bars ? (
              l.values.map((v, m) => (
                <rect
                  key={m}
                  x={x(m) - 12 + (k * 24) / lines.length}
                  y={Math.min(y(v), y(0))}
                  width={Math.max(2, 22 / lines.length)}
                  height={Math.abs(y(v) - y(0))}
                  fill={l.color}
                >
                  <title>
                    {l.label}, month {m}: €{v.toFixed(2)}
                  </title>
                </rect>
              ))
            ) : (
              <>
                <polyline
                  points={l.values.map((v, m) => `${x(m)},${y(v)}`).join(" ")}
                  fill="none"
                  stroke={l.color}
                  strokeWidth="2.8"
                  strokeDasharray={l.dashed ? "7 4" : undefined}
                />
                <circle
                  cx={x(month)}
                  cy={y(l.values[month])}
                  r="4"
                  fill={l.color}
                />
              </>
            )}
          </g>
        ))}
        {[0, 3, 6, 9, 12].map((m, k) => (
          <text
            key={m}
            x={x(m)}
            y="258"
            textAnchor="middle"
            fontSize="11"
            fill="#5e7069"
          >
            {["Jan 26", "Apr", "Jul", "Oct", "Jan 27"][k]}
          </text>
        ))}
      </svg>
      <div className="chart-legend">
        {lines.map((l) => (
          <span key={l.label}>
            <i style={{ background: l.color }} />
            {l.label}
            {l.dashed ? " (dashed)" : ""}
          </span>
        ))}
      </div>
    </figure>
  );
}
