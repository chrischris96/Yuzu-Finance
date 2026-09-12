# Yuzu Finance — bank accounting lab

Public educational EUR bank portfolio at /yuzu/. No login or backend is needed. Existing saved books remain in browser local storage; the separate example library never replaces them.

## Run and validate

Use Node 22, then npm ci, npm test, npm run build and npm start. Open http://127.0.0.1:3000/yuzu/. Static output is in out/ and is composed with the Flutter portfolio by chrischris96/website-flutter. That repository pins a reviewed Yuzu commit and tests Firebase routing before packaging. Building does not publish to Firebase.

## Version 0.4

The guided experience adds an example-first stress gallery, visible curve shocks, field explanations, an optional manual ChatGPT learning prompt, a shared citrus loader and a root portfolio link on every route. See [learning experience](../docs/LEARNING-EXPERIENCE.md). The calculation engine remains 0.4.1.

The separate `/yuzu/stress/` bank book and stress lab adds dated curves, fixed/floating debt and IRS cash flows, deposit assumptions, reconciled monthly statements, parameterised scenarios, structured external cash-flow imports, replayable run exports and an optional local SQLite archive. Use Node 22.17 or later and `npm run book:server` for that archive. Read [the methodology and recovery guide](../docs/STRESS-TESTING.md) for import schemas, BIS principles mapping and limitations. The existing demo below remains available and uses its own stated valuation model.

## Version 0.3

- Original Yuzu PNG artwork (also retained at its legacy favicon path).
- Sixteen examples covering bonds, IRS, CCS, CDS, CFD, options, cash, cash at sight and cash at call, including bank funding and asset positions.
- Monthly double-entry events; a consistent account vocabulary; separate interest receivables/payables, income/expense and amortised-cost loss allowances.
- Effective interest with monthly, quarterly, semiannual or annual coupon payments and final stub payments. Legacy saved instruments default to monthly payments.
- Side-by-side FVTPL/FVOCI paths, amortised-cost reference, valuation and cash-flow charts, monthly values, comparison CSV and current-month journal trail.

All positions begin on 1 January 2026 and run through 1 January 2027. Fair values follow supplied clean-price endpoints with accrued interest added; they are fictional paths, not market pricing. Derivatives remain valuation-only: swap legs, CDS premiums, settlement, exercise, collateral, FX and hedge accounting are not simulated. FVOCI for derivatives/cash/funding is an explicitly optional non-IFRS routing experiment, never a designation in the bank ledger. Debt alternatives require the appropriate SPPI assessment and inception business model. No early sale, Stage 3, provider feed, equity-share instrument or US GAAP engine is implemented. See /model-card/ for methodology and primary sources.

Tests verify classifications, effective yield, accrual/payment timing, maturity and stub settlement, double-entry event balancing, monthly history reconciliation, FVOCI/FVTPL total comprehensive income, sample coverage, saved-book compatibility and journal/CSV validation.
