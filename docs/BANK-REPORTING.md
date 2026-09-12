# Bank statement tree and management actions

The four navigation tabs remain Balance Sheet, Portfolio, Trial Balance and Journal Entries. The editable instrument demo uses its existing calculation engine. A saved stress run can be opened from the main page into the same four-tab navigation; every view then uses that immutable run. The stress results also contain the shared tree and action workspace.

## Reporting contract

`reporting.ts` projects existing postings into stable GL codes and bank-oriented reporting groups. Instrument IDs remain subledger keys. Income and expense accounts roll into current-period earnings in equity, and remain distinct in the trial balance. Derivative assets and liabilities are separated using closing account signs; loss allowances remain contra-assets. No legal netting arrangement is inferred. Original posting labels remain available in the evidence panel.

The statement shows signed debit-positive balances. Debits and credits are gross period movements. Opening balances are on the current reporting/mapping basis, rather than a reproduction of a previously published statement. The default comparison is the preceding reporting month. Each row's bridge explicitly allocates movements to transactions, accruals, valuation, impairment or other/manual changes, with a residual check. Statement, GL and instrument selections lead to postings and their source references; instrument detail can open all linked postings including income and OCI.

The IFRS reporting layout is controlled. The management layout can add, rename, reparent and reorder groups and reassign accounts. It is stored separately in browser storage, with cycle, parent, duplicate and missing assignment validation. It does not change postings, classifications or original runs. The statement export includes the active layout and trace. Management organisation is not a regulatory reporting assertion.

Statement groups are inspired by Deutsche Bank's 2025 consolidated statement, printed page 426 (PDF page 459):
https://investor-relations.db.com/files/documents/other-presentations-and-events/2025/Annual-Report-2025.pdf?language_id=1#page=459

IFRS 9 governs measurement/classification, not universal GL numbers. IAS 1/IFRS 18 concern presentation; IAS 32 imposes offsetting conditions. This template does not simulate tax, goodwill, every lending product or a complete bank annual report.
https://www.ifrs.org/issued-standards/list-of-standards/ifrs-9-financial-instruments/
https://www.ifrs.org/issued-standards/list-of-standards/ias-32-financial-instruments-presentation/
https://www.ifrs.org/issued-standards/list-of-standards/ifrs-18-presentation-and-disclosure-in-financial-statements/

## Risk interpretation

Risk belongs to a saved book, curve and model snapshot. Only underlying principal/valuation exposures contribute to the displayed group EVE; IDs are deduplicated. Instrument risk in GL detail is context, not a separately additive risk for every accrual/allowance account. Missing and out-of-scope coverage is explicit. The editable legacy demo never receives unrelated saved-run risk values. Economic value is not an accounting revaluation and banking-book risk is not regulatory capital.

## Mitigation contract and limitations

Actions create opening-valuation-date pro-forma alternatives using the existing replay-compatible engine. They are not dynamic crisis response after a later shock date. Three supported actions are term funding, a pay-fixed/receive-floating IRS, and partial/full sales of classified asset bonds. Multiple actions can be explored sequentially by opening a saved child run. Imported flow models are blocked because their fixed cash flows cannot legitimately be extrapolated to a changed book.

The user supplies execution size, price/rate, term, immediate execution costs, restricted collateral and a feasibility objective. All collateral is held unavailable for the projection horizon. There is no model for release, variation margin, CVA, funding capacity, taxes, bid/ask liquidity or hedge accounting. A swap is standalone FVTPL; its computed initial baseline value is paid/received up front, avoiding a free day-one gain.

The engine establishes cash through opening capital and instrument recognition. For a sale/cost/collateral action, a balanced, documented opening bridge alters that cash allocation and offsets the equity effect with disposal result, expense or restricted collateral. This is a pro-forma book reconstruction, not a transaction ledger for an ongoing historical bank. A complete disposal journal carrying historic OCI recycling requires historic reserves and trade lifecycle support. The UI labels posting differences accordingly.

The comparison shows original baseline, original stress and proposed stress, plus changes measured against each book's own baseline. Limits and missing coverage remain visible; a proposal need not improve every metric. Nothing mutates the parent. Explicit review saves the child as an immutable run, with parent ID and action parameters in its source. Export includes both runs and the full action. Existing archive replay verification applies.

BIS principle 3 supports stress testing as a decision tool, with challenged assumptions and plausible management actions; this is not BIS approval or independent model validation:
https://www.bis.org/committees/bcbs/basel-consolidated-guidelines/module/rma/30

## Verification

`npm test` retains the original accounting, bank-book, archive and learning-scenario checks and adds reporting/mitigation checks. These cover every monthly baseline/stress GL bridge, statement aggregation, exact imported dates, invalid layouts, funding net of costs/collateral, sale proceeds, swap initial settlement, parent immutability, replay and invalid actions. `npm run build` checks TypeScript, lint and static export.
