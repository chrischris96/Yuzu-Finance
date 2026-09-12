# Yuzu Finance — bank accounting and stress lab

Yuzu is a public educational bank-book simulator served under `/yuzu/` on the existing Flutter portfolio website. It needs no login, paid plan or financial-provider account.

## Version 0.4: reproducible bank book

The new `/yuzu/stress/` lab connects contract cash flows to economic value, interest, IFRS 9 measurement, monthly double-entry postings and reconciled statements. Configure curve and funding shocks, import structured external cash-flow models, compare saved runs and export replayable evidence. Incomplete economic or accounting coverage stays visible rather than silently becoming zero risk.

Read [methodology, import contracts, recovery and Basel principles mapping](docs/STRESS-TESTING.md) before interpreting results. This is an inception-style EUR model with explicit limitations, not an aged production-book adapter, calibrated regulatory model or claim of Basel compliance.

The original accounting demo, sixteen-product example library, comparison charts and saved browser portfolios remain available at `/yuzu/` and `/yuzu/comparison/`.

## Run and verify

Use Node 22.17 or later. From `frontend`, run `npm ci`, `npm test`, `npm run build`, then `npm start`. Open `http://127.0.0.1:3000/yuzu/`. Static output is `frontend/out/`.

Optionally run `npm run book:server` in a second terminal for a local append-only SQLite run archive. Public hosting uses browser storage and portable JSON exports; it has no shared database service. The historical Python/Oracle prototype is preserved separately, is not deployed, and has not been migrated or deleted.

## Website integration

`chrischris96/website-flutter` pins a Yuzu source commit, builds both projects, copies this export under the Flutter output's `yuzu/` directory, and tests routes/assets with the Firebase hosting emulator. Root website and domain remain the same. The build workflow produces an artifact and does not deploy or change billing. Verify `/yuzu/`, `/yuzu/stress/`, `/yuzu/comparison/`, `/yuzu/model-card/` and direct refreshes before publishing the combined artifact.
