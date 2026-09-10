'use client';

import React from 'react';

type UnclassifiedPattern = {
  pattern: string;
  count: number;
};

type MetricsResponse = {
  coverage_pct: number;             // % of JEs classified by rules/engine
  reviewer_accept_pct: number;      // % of auto decisions accepted by reviewer
  avg_handling_time_sec: number;    // avg human time to resolve exceptions
  top_unclassified_patterns: UnclassifiedPattern[];
  as_of_iso: string;                // ISO timestamp
};

const demoData: MetricsResponse = {
  coverage_pct: 81.7,
  reviewer_accept_pct: 94.2,
  avg_handling_time_sec: 43,
  top_unclassified_patterns: [
    { pattern: 'FX reclass on vendor prepayment', count: 12 },
    { pattern: 'Accrued bonus reversal (missing cost center)', count: 9 },
    { pattern: 'Intercompany clearing w/o counterparty code', count: 7 },
    { pattern: 'Lease mod (term change) – IFRS 16 edge', count: 6 },
    { pattern: 'Capex vs Opex threshold borderline', count: 5 },
  ],
  as_of_iso: new Date().toISOString(),
};

function formatSeconds(s: number) {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m ${r}s`;
}

function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="text-sm text-zinc-500">{title}</div>
      <div className="mt-1 text-3xl font-semibold tracking-tight">{value}</div>
      {subtitle ? (
        <div className="mt-1 text-xs text-zinc-500">{subtitle}</div>
      ) : null}
    </div>
  );
}

export default function MetricsWidget() {
  const [data, setData] = React.useState<MetricsResponse | null>(null);
  const [usingDemo, setUsingDemo] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '');
    const url = apiBase ? `${apiBase}/metrics` : undefined;

    async function load() {
      if (!url) {
        setUsingDemo(true);
        setData(demoData);
        return;
      }
      try {
        const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as MetricsResponse;
        setData(json);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to fetch metrics');
        setUsingDemo(true);
        setData(demoData);
      }
    }

    load();
    return () => controller.abort();
  }, []);

  const asOf = data ? new Date(data.as_of_iso) : null;

  return (
    <section className="w-full">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Close Health (MVP)</h2>
        <div className="flex items-center gap-2">
          {asOf ? (
            <span className="text-xs text-zinc-500">
              as of {asOf.toLocaleString()}
            </span>
          ) : null}
          {usingDemo ? (
            <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
              Demo data
            </span>
          ) : (
            <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
              Live
            </span>
          )}
        </div>
      </div>

      {error && !usingDemo ? (
        <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          Couldn’t load live metrics ({error}). Showing demo data.
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Rule Coverage"
          value={`${(data?.coverage_pct ?? 0).toFixed(1)}%`}
          subtitle="JEs auto-mapped by rules"
        />
        <StatCard
          title="Reviewer Accept"
          value={`${(data?.reviewer_accept_pct ?? 0).toFixed(1)}%`}
          subtitle="Auto decisions accepted"
        />
        <StatCard
          title="Avg Handling Time"
          value={formatSeconds(data?.avg_handling_time_sec ?? 0)}
          subtitle="For exceptions"
        />
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-zinc-500">Top Unclassified Patterns</div>
          <ul className="mt-2 space-y-1.5">
            {(data?.top_unclassified_patterns ?? []).slice(0, 5).map((p, i) => (
              <li
                key={`${p.pattern}-${i}`}
                className="flex items-start justify-between gap-3"
              >
                <span className="text-sm text-zinc-800">{p.pattern}</span>
                <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700">
                  {p.count}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-3 text-xs text-zinc-500">
        *Coverage = rules-first decisions; ML only assists on ambiguous text/vendor mapping.
        All decisions are auditable with citations.
      </p>
    </section>
  );
}
