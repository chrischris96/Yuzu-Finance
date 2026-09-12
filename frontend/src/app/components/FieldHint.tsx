"use client";
import { useId, useState } from "react";
export function fieldExplanation(label: string) {
  const rules: [RegExp, string][] = [
    [
      /sppi/i,
      "Solely payments of principal and interest: does the contract behave like basic lending? Choose pass only after assessing its terms. An equity-linked payoff usually fails.",
    ],
    [
      /business model/i,
      "How does the bank manage this asset? Hold to collect can support amortised cost; collect and sell can support FVOCI, both subject to SPPI. Trading/other leads to FVTPL in this lab.",
    ],
    [
      /regulatory book/i,
      "Banking or trading book is a risk designation, separate from IFRS 9. Only banking-book positions enter the EVE and NII risk totals.",
    ],
    [
      /treatment|accounting category/i,
      "AC uses amortised cost, FVOCI sends eligible fair-value movements to OCI, and FVTPL sends them to profit or loss. The engine rejects incompatible designations.",
    ],
    [
      /parallel/i,
      "Move every zero rate by this many basis points. +200 bp means +2 percentage points: a 3% rate becomes 5%. This illustrative shock is not a prescribed Basel calibration.",
    ],
    [
      /short.end/i,
      "A curve shock strongest at short maturities, fading with tenor. Negative values lower the short end. Combine with a long-end shock to explore a curve twist.",
    ],
    [
      /long.end/i,
      "A curve shock that grows with maturity. Positive values raise long rates more than short rates. Fixed-rate assets and funding can respond differently.",
    ],
    [
      /credit.spread shock/i,
      "Add a spread to discount rates under stress. This represents credit-spread sensitivity separately from pure interest-rate risk; it does not simulate default.",
    ],
    [
      /beta/i,
      "How strongly deposit rates respond to market-rate changes. 0 means no pass-through; 0.5 means half; 1 means full pass-through. Larger beta can raise the bank's funding cost.",
    ],
    [
      /deposit life|behavioural/i,
      "Assumed time before non-maturity deposits leave. For example, 36 months. This is a behavioural assumption requiring evidence, not the customer's legal notice period.",
    ],
    [
      /withdrawal|runoff/i,
      "Fraction of sight/call deposits withdrawn after one month in stress. 0.30 means 30%. The cash outflow can reveal a funding need even if EVE improves.",
    ],
    [
      /pd stress/i,
      "Multiply the supplied annual default probability in stress. 2 doubles it, capped at 100%. This changes the educational ECL proxy, not the interest cash-flow schedule.",
    ],
    [
      /probability|\bpd\b/i,
      "Annual probability of default. Percentage fields take 1 for 1%; JSON takes 0.01. Use assessed credit data; a fictional example is not a calibrated estimate.",
    ],
    [
      /lgd|loss given/i,
      "Loss given default: the share lost if a borrower defaults, after recoveries. 45 means 45% in a percentage field. The lab uses this in a simplified ECL proxy.",
    ],
    [
      /stage/i,
      "Stage 1 uses a probability horizon up to 12 months; Stage 2 uses remaining life in this simplified proxy. Assess deterioration separately. Stage 3 is not implemented.",
    ],
    [
      /credit.*assess/i,
      "Confirm whether the PD/LGD inputs have actually been assessed. Unassessed credit inputs stay visible as a coverage gap.",
    ],
    [
      /tenor/i,
      "Years from the curve observation date: 0 is today, 1 is one year. Use increasing nodes covering the full remaining contract and deposit life.",
    ],
    [
      /zero rate/i,
      "Annual zero-coupon rate for this tenor. Enter 3 for 3% in the screen; imported curve JSON/CSV uses 0.03. Match the selected compounding convention.",
    ],
    [
      /fixing/i,
      "Rate already set for the current floating period. Enter a percentage, for example 3 for 3%. The first period remains locked when the market curve is shocked.",
    ],
    [
      /coupon/i,
      "Contractual annual interest rate, in percent. A 3% coupon on €100,000 is approximately €3,000 per year before day-count adjustments.",
    ],
    [
      /spread/i,
      "Margin in basis points: 50 bp means 0.5 percentage points. Contractual floating margins and credit discount spreads have different roles.",
    ],
    [
      /opening value|initial.*value|initial.*consideration/i,
      "Cash consideration at the lab's starting date, in EUR. This workspace assumes no opening accrued interest. Use notional separately; derivative notional is not its price.",
    ],
    [
      /notional|principal/i,
      "Principal for debt, or the reference amount used to calculate derivative cash flows. A €1m swap notional does not mean a €1m balance-sheet asset.",
    ],
    [
      /maturity/i,
      "Final contractual payment date, later than valuation. A deposit's assumed behavioural life is set separately. This lab does not roll matured positions into new business.",
    ],
    [
      /frequency/i,
      "Months between interest payments: 1 monthly, 3 quarterly, 6 semiannual, 12 annual. Interest accrues between payments and clears when paid.",
    ],
    [
      /pay fixed|direction/i,
      "A pay-fixed/receive-floating IRS pays the fixed coupon and receives floating interest. Reversing the direction reverses its net cash flows and rate sensitivity.",
    ],
    [
      /side/i,
      "From the bank's perspective: a bond held is an asset; customer funding is a liability. A derivative may change sign as its market value changes.",
    ],
    [
      /product/i,
      "Choose the contract type. Bonds, deposits, cash and IRS have built-in cash-flow models. Other products need external model cash flows for complete risk coverage.",
    ],
    [
      /valuation date|curve.*date/i,
      "The common starting date of the book and observed market curve. They must match. The lab models contracts from this date with zero opening accrual.",
    ],
    [
      /horizon/i,
      "How far to project earnings and monthly accounts: 12, 24 or 60 months. EVE still values the complete remaining cash-flow life.",
    ],
    [
      /discount convention/i,
      "How annual zero rates become discount factors. Use the convention of your source curve; switching convention without converting rates changes values.",
    ],
    [
      /capital/i,
      "Opening paid-in equity used to fund the example bank, in EUR. It affects settlement cash but is not CET1 or a regulatory capital calculation.",
    ],
    [
      /limit|minimum projected/i,
      "Your own review threshold in EUR. A breach is a signal to investigate; this is not a BIS supervisory limit. Incomplete coverage prevents a reliable whole-book limit assessment.",
    ],
    [
      /source|provenance/i,
      "Record where the input came from and its observation date or reference. For examples, explicitly state that the data are fictional.",
    ],
    [
      /reviewer|review evidence|review status/i,
      "Record who challenged the assumptions and the evidence used. Names are declarations here, not authenticated approvals or certification.",
    ],
    [
      /version/i,
      "Give this assumption set a version, for example 1.1. A saved run retains the exact inputs and engine version needed for replay.",
    ],
    [
      /purpose|limitations/i,
      "Explain the decision this model supports and what it omits. Include which risks and behaviours need separate assessment.",
    ],
    [
      /name|\bid\b/i,
      "Use a clear descriptive name. Position IDs must be unique and stable so cash flows and ledger entries can be traced back to the same contract.",
    ],
    [
      /rate type/i,
      "Fixed coupons remain contractual; floating coupons reset from forwards after the current locked fixing. Floating debt must start at par in this lab.",
    ],
    [
      /deposit type/i,
      "Term funding has a contractual maturity. Sight/call deposits use explicitly chosen behavioural life, repricing beta and withdrawal assumptions.",
    ],
    [
      /currency/i,
      "The current stress engine models EUR. Foreign-currency positions stay visible but need an FX model before whole-book risk is complete.",
    ],
    [
      /valuation input|manual/i,
      "Use fictional prefilled inputs to learn first. Manual values should have a documented source and units; they are not fetched market quotes.",
    ],
  ];
  return (
    rules.find(([test]) => test.test(label))?.[1] ??
    "Start with the worked example, then change one assumption at a time. Keep its units and source explicit, run validation, and inspect the reconciliation and coverage messages."
  );
}
export default function FieldHint({ label }: { label: string }) {
  const [open, setOpen] = useState(false),
    [dismissed, setDismissed] = useState(false),
    id = useId();
  const tip = fieldExplanation(label);
  return (
    <span
      className={`field-hint ${open ? "is-open" : ""} ${dismissed ? "is-dismissed" : ""}`}
      tabIndex={0}
      aria-describedby={id}
      onClick={(e) => {
        e.preventDefault();
        setDismissed(false);
        setOpen(!open);
      }}
      onBlur={() => {
        setOpen(false);
        setDismissed(false);
      }}
      onMouseLeave={() => setDismissed(false)}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setOpen(false);
          setDismissed(true);
        }
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setDismissed(false);
          setOpen(!open);
        }
      }}
    >
      {label}
      <span aria-hidden="true" className="hint-mark">
        {" "}
        ⓘ
      </span>
      <span id={id} className="field-tooltip" role="tooltip" aria-hidden="true">
        {tip}
      </span>
    </span>
  );
}
