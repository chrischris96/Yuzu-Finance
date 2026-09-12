# Guided portfolio and stress experience

The `/yuzu/stress/` landing tab now offers three worked setups on the same fictional six-position bank. No input is required to inspect results, shocks, cash/interest paths and economic-value attribution. Loading an example replaces only the editable draft; saved runs remain intact.

- **Rates rise:** +200 bp parallel shock, beta 0.5 and 36-month deposit life. Fixed-rate bond losses are partly offset by the pay-fixed IRS and deposit liability value effects.
- **Curve twist:** short-end parameter −100 bp and long-end parameter +200 bp, with the existing engine's exponential shaping. The displayed curve and exact tenor table show the actual shocks.
- **Funding squeeze:** rates +200 bp, spread +100 bp, beta 1.5, 12-month deposit life, 30% withdrawal and PD multiplier 2. Funding cash and earnings fall relative to the rates-rise setup. Each setup uses its own baseline; shortening assumed deposit life changes that baseline too.

These are distinct assumption sets within the same cash-flow engine, not three independently validated valuation models. The economic explanations apply the concepts in [BIS IRRBB guidance](https://www.bis.org/committees/bcbs/basel-framework/standard/srp/98/inforce/2026-01-01/published/2024-07-16) and [stress-testing principles](https://www.bis.org/committees/bcbs/basel-consolidated-guidelines/module/rma/30). Shocks and limits remain illustrative, not supervisory calibrations. The lab does not calculate LCR or regulatory capital.

Field labels in instrument and scenario forms offer hover, keyboard-focus and tap guidance. Help covers units, SPPI/business model, classification, fixing, deposit assumptions and model provenance. The global Help getting started panel gives an example-first workflow.

The optional ChatGPT feature is a manual learning handoff: the user can review and copy a generic prompt, then open ChatGPT separately. It has no OAuth/API connection, API key, portfolio upload, automatic field extraction or paid service. No data are sent to ChatGPT by the app. Account access is the user's own.

Every Yuzu route includes an ordinary root hyperlink back to the Flutter portfolio. It deliberately bypasses Next's `/yuzu` basePath. The shared citrus loader uses three CSS motions and honours reduced-motion preferences. Yuzu hides its initial loader at hydration; Flutter hides its loader on the actual first-frame event, with no minimum display delay.

Validation includes the existing 78 accounting/stress/archive checks plus scenario-specific economic-direction and reconciliation assertions. Website integration verifies the portfolio title/manifest, loader assets and root navigation from every exported Yuzu route. The accounting engine and saved-run version are unchanged.
