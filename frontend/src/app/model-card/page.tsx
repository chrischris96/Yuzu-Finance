export default function ModelCard() {
  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-bold">Model Card — “Rules v0”</h1>

      <section className="space-y-2">
        <h2 className="font-semibold">Summary</h2>
        <p>
          Deterministic rules engine that maps journal entries to IFRS topics and surfaces
          citations. Designed for financial-grade reliability and explainability.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Intended use</h2>
        <ul className="list-disc ml-5 space-y-1">
          <li>Assist accountants with JE mapping and IFRS rationale.</li>
          <li>Act as a high-precision baseline for future hybrid (rules+ML) routing.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Data & coverage</h2>
        <p>
          Demo batches only. CSV fields: date, account_code, account_name, debit, credit, description,
          currency, cost_center, entry_type. No PII. Scope limited to common revenue, deferrals,
          PPE depreciation examples.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Decisioning</h2>
        <ul className="list-disc ml-5 space-y-1">
          <li>Rule match → IFRS rule ID + tooltip with paragraph references.</li>
          <li>No match → abstain (flag for review).</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Metrics roadmap (to be reported)</h2>
        <ul className="list-disc ml-5 space-y-1">
          <li>Coverage (% JEs with confident rule match)</li>
          <li>Abstain rate</li>
          <li>Reconciliation pass rate (batch-level)</li>
          <li>Reviewer time saved (sec/JE)</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Limitations</h2>
        <ul className="list-disc ml-5 space-y-1">
          <li>Rules v0 is not a substitute for professional judgment.</li>
          <li>Limited IFRS topics in demo; edge cases may abstain.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Contact</h2>
        <p>For questions or overrides, contact the project owner.</p>
      </section>
    </main>
  );
}
