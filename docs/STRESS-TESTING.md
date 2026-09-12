# Bank Book & Stress Lab — version 0.4

The separate `/yuzu/stress/` workspace connects dated contract inputs, cash flows, valuation, interest, double-entry postings and saved stress-test evidence. It is an educational implementation informed by Basel Committee principles, not a regulatory reporting or independently validated bank system. The earlier `/yuzu/` accounting demo and its saved portfolios remain available.

## Reproduce a result

1. Use the six-position example or add contracts in the Bank book dialog. Record a source and valuation date. Assign the regulatory banking/trading book separately from IFRS 9 treatment, SPPI and business model.
2. In Models & scenarios, select a template and set the curve, shocks, deposit assumptions, credit assumptions, reporting horizon and limits. Templates are illustrative, not supervisory calibrations.
3. Validate and run. Inspect coverage first, then EVE, NII, projected cash, monthly statements, journal entries and cash-flow traces. Every monthly statement must reconcile to the cent or calculation fails.
4. Export the reproducible run. It contains the complete book, market curve, model, assumptions, engine version, input fingerprint and result fingerprint. Saved runs are immutable through the app. Draft changes require a new run.
5. Import a run to verify its hashes and recalculate every result with the matching engine. Compare saved runs only when the book, curve and horizon match. Preserve the source commit with exported runs for long-term replay after engine upgrades.

SHA-256 fingerprints detect accidental or partial modification; they are not digital signatures or proof of an authenticated author. A person controlling a file can recompute its hashes. Browser storage can be cleared, so export evidence you wish to retain.

## Scope and calculations

- EUR only; ACT/365 fixed; monthly, quarterly, semiannual or annual payments with a final stub. Calendar dates clamp to month end; holidays and business-day adjustments are not implemented.
- Engine 0.4.1 fixes monetary cash-flow settlements to EUR cents before projection and hashing, avoiding browser/Node differences in sub-cent floating-point results. Deposit withdrawal and residual principal share the rounded total. Earlier development runs retain their original engine version and require that version to replay.
- This is an inception-style snapshot: opening values are consideration amounts with zero opening accrued interest. Fair-value differences appear at the first reporting date. Importing an aged production ledger requires additional opening accrued interest, reserves, allowances and historical effective yields; do not reinterpret this adapter as that capability.
- Built-in cash flows cover bullet fixed/floating bonds, term deposits, behavioural sight/call deposits, cash and net pay-fixed/receive-floating IRS (or reverse). The first floating period uses the supplied fixing; subsequent periods use forwards from discount factors. IRS does not exchange principal.
- Fixed debt effective yield solves opening consideration against the complete baseline schedule and is preserved under stress. Floating debt is restricted to opening at par. Contractual unpaid interest is shown separately from effective-interest amortisation.
- Linear interpolation of zero rates; continuous discounting `exp(-r*t)` or annual `(1+r)^(-t)`. A single curve projects and discounts cash flows. All maturities must be covered; there is no silent extrapolation.
- A persistent shock in basis points is `parallel + short*exp(-t/2) + long*(1-exp(-t/2))`. Credit-spread shocks are separate. Combined shocks are broader economic stress, not pure interest-rate risk.
- EVE change is stressed minus baseline present value of full remaining banking-book cash flows. NII change is cumulative modelled banking-book interest over the selected 12, 24 or 60 months. Changing AC/FVOCI/FVTPL alone does not change economic exposure.
- The balance sheet runs off: no replacement business, reinvestment, management actions or interest on settlement cash. Deposit beta and behavioural life apply in both scenarios; the selected withdrawal fraction occurs after one month under stress. Principal is preserved across withdrawal and residual maturity payments.
- Negative settlement cash identifies an unmodelled funding requirement. The complete NII delta is withheld because funding costs are missing. Projected cash is not LCR or a liquidity survival model.
- ECL is a transparent proxy: annual PD is converted to a cumulative probability over the remaining Stage 1 (up to one year) or Stage 2 life, multiplied by LGD and remaining principal, then discounted at the midpoint. It is not calibrated IFRS 9 ECL: no probability-weighted macro scenarios, SICR assessment, Stage 3 or defaults. Unassessed inputs are visible, not assumed assessed.
- AC deducts the allowance; FVOCI retains fair value with ECL in P&L and an OCI offset; FVTPL has no separate allowance. Permitted classifications are checked. Regulatory capital, RWA, own-credit effects, hedge accounting, taxes and US GAAP are outside this version.
- Unsupported products and FX stay visible in the book. Missing banking risk models or unmapped adjustments withhold whole-book EVE/NII instead of returning misleading zeroes. Coverage labels distinguish economic, accounting and credit completeness. A balanced journal alone does not prove economic completeness.

## Import contract

Use the app's Export book, Export curve and Export model buttons to obtain complete versioned templates. JSON rates are decimals (`0.03` means 3%); shocks are basis points. Curve CSV headers are `years,zero_rate`. Each input must identify its source. Imports are validated before becoming editable state.

An external model is a **data interface**, not uploaded executable code. Run the current book first, then export its external cash-flow template from Models & scenarios. Run your Python/R/other model outside the app and populate `external.positions` with signed EUR cash flows. The envelope includes:

```json
{
  "kind": "imported-cashflows",
  "external": {
    "snapshotHash": "SHA-256 of the exact book",
    "curve": {"asOf":"2026-01-01","source":"Your observation","nodes":[{"years":0,"rate":0.03},{"years":51,"rate":0.03}]},
    "positions": [{
      "id": "existing-position-id",
      "baseline": [{"date":"2027-01-01","interest":3,"principal":100,"label":"Maturity"}],
      "stress": [{"date":"2027-01-01","interest":3,"principal":100,"label":"Maturity"}]
    }]
  }
}
```

This fragment supplements the exported full model, which also requires schema version, identity, purpose, owner, model version, limitations, review metadata, compounding, parameters and limits. The exact book fingerprint **and curve** must match. Cash flows must be nonempty, ordered, future-dated and within the curve. IDs must exist and be unique. Debt principal must reconcile; bullet principal must occur at contractual maturity. Fixed debt cash flows cannot change between scenarios in this accounting adapter; IRS cannot exchange principal; cash cannot be overridden. Supplied cash flows replace built-in projection for that position, while the engine still discounts them under the corresponding scenario. Missing external entries use a built-in model where available, otherwise remain uncovered.

External CCS, CDS, CFD or option cash flows can support a scenario valuation path, but structural validation is not an option-pricing, default, collateral, FX or path-dependent model. Rates in the envelope must be consistent with the external producer; the app cannot verify the producer's economic correctness. A new book or curve requires regenerating the model envelope.

Legacy demo import creates a separate draft and preserves the original local storage. Review banking/trading designations, swap direction, fixings and deposit assumptions. Legacy fixed ECL amounts do not become guessed PD/LGD calibration; credit inputs require assessment. Manual adjustments remain balanced but risk-unmapped until explicitly justified or represented as contracts.

## Local database archive and recovery

Node 22.17 or later is required (the bundled SQLite API may report an experimental warning). From `frontend`:

```sh
npm ci
npm test
npm run build
npm start
```

In a second terminal, run `npm run book:server`. The optional archive listens only on `127.0.0.1:8787` and stores verified runs in `.book-data/bank-book.sqlite`. Local preview offers Save to local database and Restore controls. `YUZU_DATA_DIR` can select another backup-managed directory; `YUZU_ARCHIVE_PORT` is intended for test isolation (the UI uses 8787). The public HTTPS website uses IndexedDB/export and does not connect to this local service. No paid service or plan is needed.

The service accepts JSON only, bounds request size, checks Host and local Origin, recalculates runs before insertion, and uses unique IDs and SQLite update/delete-prevention triggers. It is single-user and has no public authentication layer. Never expose it as a shared bank backend. These are application immutability controls, not protection against the database administrator.

For backup, stop the archive and copy the entire `.book-data` directory, including any SQLite sidecar files. Restore the directory before restarting. Exported run JSON provides a portable alternative: import/replay it and save it to a new local archive. The listing returns the latest 100 runs; older records remain in SQLite. Archive tests exercise persistence across restart and prohibit updates/deletes. No Oracle database, Docker volume or historical backend has been removed or migrated. The original Oracle prototype is separate and is not wired to the new lab.

## Basel Committee principles: controls and remaining responsibilities

The [stress-testing principles](https://www.bis.org/committees/bcbs/basel-consolidated-guidelines/module/rma/30) guide these proportionate controls. They require organisational practice as well as software; a portfolio demo cannot establish those practices by itself.

| Principle (paraphrased) | Implemented evidence | Remaining responsibility |
| --- | --- | --- |
| 1. Clear objectives | Purpose, horizon, named scenarios and limits retained in each run | Define actual bank decisions and risk appetite |
| 2. Governance | Owner, version, declared reviewer and review notes; edits reset model review | Authenticated responsibilities, approvals and escalation |
| 3. Use in decisions | Comparable baseline/stress results, limits and visible breaches | Management use and documented actions |
| 4. Material risks and severity | Coverage gating, rate/spread/deposit/credit parameters | Risk inventory, scenarios, interactions and severity calibration |
| 5. Resources | Bounded deterministic engine and repeatable local workflow | Staffing, skills, capacity and continuity |
| 6. Data and infrastructure | Dated inputs, preserved snapshots, validation, hashes, reconciliation, archive | Provider reconciliation, access control and operational resilience |
| 7. Appropriate methodology | Cash-flow traces, explicit formulas and assumptions | Empirical calibration and fitness for each intended use |
| 8. Challenge and review | Benchmarks, adverse-input tests, replay and review evidence fields | Independent validation, backtesting and periodic challenge |
| 9. Communication | Attribution, monthly visuals, exceptions and exported evidence | Reporting to the appropriate decision makers |

Data lineage and reconciliation also reflect the concerns of [BCBS 239](https://www.bis.org/publ/bcbs239.pdf). The distinction between full-life economic value and horizon earnings is informed by [IRRBB guidance effective in 2026](https://www.bis.org/committees/bcbs/basel-framework/standard/srp/98/inforce/2026-01-01/published/2024-07-16). This version does not implement the prescribed supervisory shock calibration, standardised IRRBB calculation or regulatory thresholds.

## Validation and release

`npm test` runs the existing accounting suite, bank-book/stress benchmarks and SQLite recovery/security checks. Tests include independent zero-coupon PV formulas, no-shock equality, rate direction, accounting-category risk invariance, 60-month reconciliation, deposit runoff, locked first fixing, external cash-flow contracts, incomplete coverage, negative cash and tampered evidence. Static export also checks TypeScript and lint. Website CI builds Flutter, composes `/yuzu/` and verifies direct routes and assets using the Firebase hosting emulator. CI builds an artifact; it does not deploy or change billing.

Future extensions need explicit model and test contracts: aged opening balances, multi-currency curves and FX, credit defaults/Stage 3, calibrated option and derivative models, collateral/netting, behavioural backtesting, management actions and authenticated shared persistence. The current controls make those gaps visible; they do not claim that all bank risks are implemented.
