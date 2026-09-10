"use client";
import { useEffect, useRef, useState } from "react";
import {
  Instrument,
  PRODUCTS,
  Product,
  template,
  isDerivative,
  classify,
  rationale,
  validateInstrument,
  guidedSPPI,
  money,
} from "@/lib/accounting";

export default function InstrumentForm({
  initial,
  onSave,
  onClose,
}: {
  initial: Instrument | null;
  onSave: (i: Instrument) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState<Instrument>(initial || template());
  const [errors, setErrors] = useState<string[]>([]);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => node?.close();
  }, []);
  function update<K extends keyof Instrument>(key: K, v: Instrument[K]) {
    setValue((prev) => ({
      ...prev,
      [key]: v,
      ...(key === "initial" ? { marketMode: "manual" as const } : {}),
    }));
  }
  const derivative = isDerivative(value.product),
    cash = value.product === "Cash",
    debtAsset = !derivative && !cash && value.side === "asset";
  const category = classify(value);
  const numberField = (
    label: string,
    key: "notional" | "initial" | "terminal" | "coupon" | "maturity" | "ecl",
    hint?: string,
  ) => (
    <label>
      {label}
      <input
        type="number"
        required
        step={key === "maturity" ? 1 : 0.01}
        value={Number.isNaN(value[key]) ? "" : value[key]}
        onChange={(e) =>
          update(key, e.target.value === "" ? NaN : Number(e.target.value))
        }
      />
      {hint && <small className="muted">{hint}</small>}
    </label>
  );
  return (
    <dialog
      ref={dialog}
      className="modal"
      aria-labelledby="instrument-title"
      onCancel={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const normalized = {
            ...value,
            ...(cash
              ? {
                  side: "asset" as const,
                  initial: value.notional,
                  terminal: value.notional,
                  coupon: 0,
                  ecl: 0,
                }
              : {}),
            id: value.id || crypto.randomUUID(),
          };
          const found = validateInstrument(normalized);
          setErrors(found);
          if (!found.length) onSave(normalized);
        }}
      >
        <div className="toolbar">
          <div>
            <p className="eyebrow">BANK BOOK · EUR</p>
            <h2 id="instrument-title">
              {initial?.id ? "Edit instrument" : "Add an instrument"}
            </h2>
          </div>
          <button
            type="button"
            className="secondary"
            onClick={onClose}
            aria-label="Close instrument form"
          >
            ✕
          </button>
        </div>
        <div className="form-grid">
          <label>
            Financial product
            <select
              value={value.product}
              onChange={(e) =>
                setValue({
                  ...template(e.target.value as Product),
                  id: value.id,
                })
              }
            >
              {PRODUCTS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
            <small className="muted">
              IRS: interest rate swap · CCS: cross-currency swap · CDS: credit
              default swap · CFD: contract for difference.
            </small>
          </label>
          <label>
            Instrument name
            <input
              required
              maxLength={100}
              value={value.name}
              onChange={(e) => update("name", e.target.value)}
            />
          </label>
          {!derivative && !cash && (
            <label>
              Bank&apos;s position
              <select
                value={value.side}
                onChange={(e) =>
                  update("side", e.target.value as Instrument["side"])
                }
              >
                <option value="asset">Asset — held / deposit placed</option>
                <option value="liability">
                  Liability — issued / deposit taken
                </option>
              </select>
            </label>
          )}
          <label>
            Valuation input
            <select
              value={value.marketMode}
              onChange={(e) => {
                if (e.target.value === "sample")
                  setValue({
                    ...value,
                    marketMode: "sample",
                    initial: derivative ? 0 : value.notional,
                    terminal: derivative
                      ? value.notional * 0.025
                      : cash
                        ? value.notional
                        : value.notional * 1.02,
                  });
                else update("marketMode", "manual");
              }}
            >
              <option value="sample">Prefilled illustrative scenario</option>
              <option value="manual">Manual values</option>
            </select>
            <small className="muted">
              Sample values are fictional, not provider quotes. All amounts are
              EUR.
            </small>
          </label>
          {numberField(
            derivative
              ? "Reference notional (€)"
              : "Face value / principal (€)",
            "notional",
            derivative
              ? "Reference only. Derivative notional is not added to the balance sheet."
              : undefined,
          )}
          {!cash &&
            numberField(
              derivative
                ? "Opening signed fair value (€)"
                : "Opening consideration (€)",
              "initial",
              derivative
                ? "Positive = bank asset; negative = bank liability."
                : "At 1 January 2026; no transaction costs in this version.",
            )}
          {!cash && (
            <label>
              Fair value at 1 January 2027 (€)
              <input
                type="number"
                required
                step=".01"
                value={Number.isNaN(value.terminal) ? "" : value.terminal}
                onChange={(e) =>
                  setValue({
                    ...value,
                    terminal:
                      e.target.value === "" ? NaN : Number(e.target.value),
                    marketMode: "manual",
                  })
                }
              />
              <small className="muted">
                {derivative
                  ? "Signed fair value, not notional."
                  : "Total ex-coupon fair value, not price per 100."}{" "}
                A straight-line scenario between opening and ending values is
                used for intermediate dates.
              </small>
            </label>
          )}
          {!cash &&
            numberField(
              "Contract maturity (months)",
              "maturity",
              derivative
                ? "Beyond 12 months. Interim derivative payments and settlement are not modelled."
                : "Principal redeemed at maturity. Choose the interest payment schedule below. Deposits assume no withdrawals before the chosen scenario end.",
            )}
          {!derivative &&
            !cash &&
            numberField(
              "Annual contractual coupon / deposit rate (%)",
              "coupon",
              "Interest accrues monthly; cash follows the payment schedule. Effective yield is derived from consideration, coupons and redemption.",
            )}
          {!derivative && !cash && (
            <label>
              Interest payment schedule
              <select
                value={value.paymentFrequency ?? 1}
                onChange={(e) =>
                  update("paymentFrequency", Number(e.target.value))
                }
              >
                <option value={1}>Monthly</option>
                <option value={3}>Quarterly</option>
                <option value={6}>Semiannual</option>
                <option value={12}>Annual</option>
              </select>
              <small className="muted">
                Unpaid contractual interest appears separately as accrued
                interest. A final short period is paid at maturity.
              </small>
            </label>
          )}
        </div>
        {debtAsset && (
          <section className="panel">
            <h3>IFRS 9 classification at inception</h3>
            <div className="form-grid">
              <label>
                Business model
                <select
                  value={value.businessModel}
                  onChange={(e) =>
                    update(
                      "businessModel",
                      e.target.value as Instrument["businessModel"],
                    )
                  }
                >
                  <option value="collect">
                    Hold to collect contractual cash flows
                  </option>
                  <option value="collect-sell">
                    Collect cash flows and sell
                  </option>
                  <option value="trading">Trading / other</option>
                </select>
              </label>
              <label>
                SPPI assessment method
                <select
                  value={value.assessment}
                  onChange={(e) =>
                    update(
                      "assessment",
                      e.target.value as Instrument["assessment"],
                    )
                  }
                >
                  <option value="direct">Enter an assessed SPPI result</option>
                  <option value="guided">
                    Walk through a preliminary screen
                  </option>
                </select>
              </label>
              {value.assessment === "direct" ? (
                <label>
                  SPPI result
                  <select
                    value={value.sppi}
                    onChange={(e) =>
                      update("sppi", e.target.value as Instrument["sppi"])
                    }
                  >
                    <option value="pass">
                      Pass — solely principal and interest
                    </option>
                    <option value="fail">
                      Fail — other cash-flow exposure
                    </option>
                    <option value="review">
                      Not yet assessed / needs review
                    </option>
                  </select>
                </label>
              ) : (
                <div className="full">
                  <p className="compact">
                    Preliminary screen for plain lending instruments. This does
                    not replace a contract-level SPPI assessment, including the
                    amendments effective in 2026.
                  </p>
                  {[
                    "Are payments limited to principal and compensation for time value, credit risk, basic lending risks/costs and a profit margin?",
                    "Do cash flows expose the bank to leverage, equity prices or commodity prices?",
                    "Are there prepayment, extension, contingent / ESG-linked or modified interest-reset terms?",
                    "Is the instrument non-recourse, contractually linked, or are other complex terms present?",
                  ].map((q, index) => (
                    <label key={q} style={{ marginBottom: 12 }}>
                      {index + 1}. {q}
                      <select
                        value={value.answers[index]}
                        onChange={(e) =>
                          update(
                            "answers",
                            value.answers.map((a, k) =>
                              k === index ? e.target.value : a,
                            ),
                          )
                        }
                      >
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                        <option value="uncertain">Uncertain</option>
                      </select>
                    </label>
                  ))}
                  <strong>
                    Screen result:{" "}
                    {guidedSPPI(value.answers) === "pass"
                      ? "Indicative pass"
                      : guidedSPPI(value.answers) === "fail"
                        ? "Fail"
                        : "Further assessment required"}
                  </strong>
                </div>
              )}
              {(category === "Amortised cost" || category === "FVOCI") && (
                <>
                  <label>
                    Credit-loss stage
                    <select
                      value={value.stage}
                      onChange={(e) =>
                        update("stage", e.target.value as Instrument["stage"])
                      }
                    >
                      <option value="1">Stage 1 — 12-month ECL</option>
                      <option value="2">Stage 2 — lifetime ECL</option>
                    </select>
                    <small className="muted">
                      Credit-impaired / Stage 3 assets are outside this version.
                    </small>
                  </label>
                  {numberField(
                    "Assessed loss allowance (€)",
                    "ecl",
                    "User-supplied ECL held constant until redemption. No credit-risk estimation model is implied.",
                  )}
                </>
              )}
            </div>
          </section>
        )}
        <div className="notice">
          <strong>{category}</strong>
          <p style={{ marginBottom: 0 }}>{rationale(value)}</p>
          {derivative && (
            <p>
              Valuation-only scenario: supply fair values that include all
              relevant market risks. Multi-currency cash flows, collateral,
              netting and hedge accounting are outside this version.
            </p>
          )}
        </div>
        <p className="compact muted">
          All instruments begin on 1 January 2026. Editing assumptions
          recalculates the scenario from inception; it is not an accounting
          reclassification event.{" "}
          {cash && `Cash will be recorded at ${money(value.notional)}.`}
        </p>
        {errors.length > 0 && (
          <div className="notice error" role="alert">
            {errors.map((e) => (
              <div key={e}>{e}</div>
            ))}
          </div>
        )}
        <div className="actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit">
            {category === "Review required"
              ? "Save for review"
              : "Save instrument"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
