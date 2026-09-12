import { useId } from "react";
export default function StressPlot({
  title,
  dates,
  lines,
  selected,
}: {
  title: string;
  dates: string[];
  lines: { name: string; values: number[]; color: string }[];
  selected: number;
}) {
  const id = useId(),
    values = lines.flatMap((l) => l.values),
    low = Math.min(0, ...values),
    high = Math.max(0, ...values),
    span = high - low || 1;
  const x = (n: number) => 65 + (n * 440) / (dates.length - 1),
    y = (v: number) => 225 - ((v - low) / span) * 180;
  return (
    <figure className="time-chart">
      <figcaption>
        <h3 id={id}>{title}</h3>
        <p>
          EUR · {dates[0]} to {dates.at(-1)}. Exact values are available in the
          monthly table.
        </p>
      </figcaption>
      <svg viewBox="0 0 545 275" role="img" aria-labelledby={id}>
        <desc>
          {lines
            .map(
              (l) =>
                `${l.name}, selected date: ${l.values[selected].toFixed(2)} EUR`,
            )
            .join(". ")}
        </desc>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line
              x1="65"
              x2="505"
              y1={y(low + t * span)}
              y2={y(low + t * span)}
              stroke="#d9e1d8"
            />
            <text
              x="58"
              y={y(low + t * span) + 4}
              fontSize="11"
              fill="#5e7069"
              textAnchor="end"
            >
              {new Intl.NumberFormat("en", {
                notation: "compact",
                maximumFractionDigits: 1,
              }).format(low + t * span)}
            </text>
          </g>
        ))}
        <line
          x1={x(selected)}
          x2={x(selected)}
          y1="35"
          y2="233"
          stroke="#84938a"
          strokeDasharray="4 3"
        />
        {lines.map((l, k) => (
          <g key={l.name}>
            <polyline
              points={l.values.map((v, n) => `${x(n)},${y(v)}`).join(" ")}
              fill="none"
              stroke={l.color}
              strokeWidth="2.5"
              strokeDasharray={k % 2 ? "7 3" : undefined}
            />
            <circle
              cx={x(selected)}
              cy={y(l.values[selected])}
              r="4"
              fill={l.color}
            />
          </g>
        ))}
        {[0, Math.floor((dates.length - 1) / 2), dates.length - 1].map((n) => (
          <text
            key={n}
            x={x(n)}
            y="258"
            textAnchor="middle"
            fontSize="11"
            fill="#5e7069"
          >
            {dates[n]}
          </text>
        ))}
      </svg>
      <div className="chart-legend">
        {lines.map((l) => (
          <span key={l.name}>
            <i style={{ background: l.color }} />
            {l.name}
          </span>
        ))}
      </div>
    </figure>
  );
}
