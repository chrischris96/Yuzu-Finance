# Yuzu Finance — bank portfolio demo

Yuzu is an educational bank-book simulator. The public demo is a static Next.js export at `/yuzu/`. It needs no login, backend, Oracle database, new domain, or provider account. Each browser profile keeps an independent local workspace.

## Run and verify

From `frontend`, use Node 22 and run `npm ci`, `npm test`, and `npm run build`. Run `npm run dev` and open `http://localhost:3000/yuzu/` for development. The static result is `frontend/out/`.

## Included

- Bank portfolio with bonds, IRS, CCS, CDS, CFD, options, cash, sight deposits and call deposits.
- Instrument dialog with prefilled sample or manual EUR valuation inputs, asset/liability position, SPPI result or preliminary guided screen, business model and user-assessed ECL.
- Reporting dates from 2026-01-01 through 2027-01-01, reconciled balance sheet, account balances and generated snapshot journal postings.
- Balanced manual adjustments and quoted CSV upload with date, currency, account and amount validation. Downloadable sample and isolated browser persistence.
- Separate instrument comparison route; IFRS 9 is implemented in the stated limited scope. US GAAP is labelled planned.
- Methodology and limitations at `/yuzu/model-card/`.

## Integrating with the Flutter website

The existing website repository is `chrischris96/website-flutter`. Its contents and hosting configuration were not accessible through the current GitHub connection during implementation, so no production workflow or website source has been changed.

1. Build Yuzu with `cd frontend && npm ci && npm test && npm run build`.
2. Build the existing Flutter website with its existing production settings.
3. Copy **the contents** of `frontend/out/` into the Flutter deployment output's `yuzu/` directory (usually `build/web/yuzu/`). Keep the Flutter site's existing root files and domain configuration.
4. Set the portfolio project's link to `/yuzu/`.
5. Publish the combined output using the site's existing workflow.

The Next.js `basePath` is `/yuzu` and trailing slashes are enabled. Keep `_next/`, `comparison/index.html`, `model-card/index.html`, and other exported assets beneath `yuzu/`. Ensure the host serves actual `/yuzu/` files before a Flutter catch-all rewrite. Check the root website, `/yuzu/`, `/yuzu/comparison/`, `/yuzu/model-card/`, and a direct refresh of each route. A root-scoped Flutter service worker must not intercept Yuzu paths or substitute the Flutter shell; inspect the existing service-worker setup before release. A domain or hosting migration is not necessary when the current host supports these static paths.

No new Sites project was registered: the requested deployment target is the existing domain's subpath, whose hosting configuration remains to be inspected.

## Accounting scope

The pure engine lives in `frontend/src/lib/accounting.ts`. It separates instrument inputs, classification, measurement and double-entry aggregation. Bonds use monthly effective interest, monthly coupons and redemption. Fair-value paths interpolate user-supplied endpoints. Derivatives are valuation-only, with no interim payments, FX translation, collateral, netting or hedge accounting. ECL is an externally assessed fixed allowance, not a credit-risk model. Stage 3, fees, irregular cash flows, taxes and regulatory reporting are not modelled. SPPI guidance is a preliminary screen, with complex features referred for review. Read the in-app methodology before interpreting outputs.

The Python/Oracle prototype is preserved as historical source but is **not used or deployed** by this public demo. Its old authentication and deployment code is not production ready.

Future financial-provider connectors should populate explicit dated market inputs rather than overwrite accounting assumptions. Multi-GAAP support should apply separate standard rules to shared instrument/market inputs; it is not yet implemented.
