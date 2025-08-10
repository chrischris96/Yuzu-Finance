import React from 'react';

function Step({
  title,
  body,
}: {
  title: string;
  body: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="text-base font-semibold">{title}</div>
      <div className="mt-2 text-sm leading-6 text-zinc-700">{body}</div>
    </div>
  );
}

export default function HowItWorks() {
  return (
    <section className="w-full">
      <h2 className="mb-3 text-xl font-semibold">How Yuzu Works (Rules-first, ML-assist)</h2>
      <div className="grid gap-3 lg:grid-cols-3">
        <Step
          title="1) Ingest & Validate"
          body={
            <>
              Upload JEs in any flat format (CSV/XLS/ERP export). We normalize fields,
              detect missing required attributes (e.g., cost center), and enforce basic
              sanity checks.
            </>
          }
        />
        <Step
          title="2) Match to Accounting Rules"
          body={
            <>
              Deterministic rules implement your chart of accounts and IFRS/GAAP
              treatments for the common 70–90% of cases. Each rule logs why it fired and
              attaches the relevant standard paragraph for audit.
            </>
          }
        />
        <Step
          title="3) Explain & Cite"
          body={
            <>
              Every decision gets a tooltip with a plain-English rationale and citations
              (e.g., “IFRS 16 ¶23–28”), so reviewers can trust and verify quickly—no
              black boxes.
            </>
          }
        />
        <Step
          title="4) Human-in-the-Loop"
          body={
            <>
              Ambiguities and edge cases are routed to a small review queue with smart
              defaults. Bulk actions and keyboard flows keep throughput high during close.
            </>
          }
        />
        <Step
          title="5) Post & Reconcile"
          body={
            <>
              Approved entries are posted/exported. Reconciliation views surface
              differences (sub-ledgers, IC, FX), with drill-through to the underlying JEs
              and rules that drove them.
            </>
          }
        />
        <Step
          title="6) Monitor & Improve"
          body={
            <>
              The metrics widget tracks rule coverage, reviewer accept rate, handling time
              and the top unclassified patterns—so you can prioritize the next rule or add a
              small ML assist where rules are brittle.
            </>
          }
        />
      </div>

      <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        <div className="font-medium">Why trust it?</div>
        <ul className="ml-5 list-disc space-y-1">
          <li>Rules you can read; decisions you can audit.</li>
          <li>Citations to authoritative guidance for every mapped JE.</li>
          <li>Human review for the gray areas; full lineage & logs.</li>
          <li>Metrics that prove reliability and keep improving coverage.</li>
        </ul>
      </div>
    </section>
  );
}
