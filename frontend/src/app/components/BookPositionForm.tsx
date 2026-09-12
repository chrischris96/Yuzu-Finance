"use client";
import FieldHint from "./FieldHint";
import { useEffect, useRef, useState } from "react";
import { BookPosition } from "@/lib/bank-book";
export default function BookPositionForm({
  initial,
  onSave,
  onClose,
}: {
  initial: BookPosition;
  onSave: (p: BookPosition) => void;
  onClose: () => void;
}) {
  const [p, set] = useState(initial),
    dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => node?.close();
  }, []);
  function update<K extends keyof BookPosition>(
    key: K,
    value: BookPosition[K],
  ) {
    set({ ...p, [key]: value });
  }
  const select = (
    label: string,
    key: keyof BookPosition,
    choices: [string, string][],
  ) => (
    <label>
      <FieldHint label={label} />
      <select
        value={String(p[key])}
        onChange={(e) =>
          set({
            ...p,
            [key]:
              key === "frequency" || key === "stage"
                ? Number(e.target.value)
                : e.target.value,
          })
        }
      >
        {choices.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
  const number = (
    label: string,
    key:
      | "notional"
      | "openingValue"
      | "coupon"
      | "fixing"
      | "spreadBp"
      | "creditSpreadBp"
      | "pd"
      | "lgd",
    percent = false,
  ) => (
    <label>
      <FieldHint label={label} />
      <input
        required
        type="number"
        step="any"
        value={Number.isFinite(p[key]) ? p[key] * (percent ? 100 : 1) : ""}
        onChange={(e) =>
          update(
            key,
            e.target.value === ""
              ? NaN
              : Number(e.target.value) / (percent ? 100 : 1),
          )
        }
      />
    </label>
  );
  return (
    <dialog
      ref={dialog}
      className="modal"
      onCancel={onClose}
      aria-labelledby="book-position-title"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(p);
        }}
      >
        <div className="toolbar">
          <h2 id="book-position-title">Instrument contract & classification</h2>
          <button type="button" className="secondary" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="form-grid">
          <label>
            <FieldHint label="Name" />
            <input
              required
              value={p.name}
              maxLength={100}
              onChange={(e) => update("name", e.target.value)}
            />
          </label>
          {select(
            "Product",
            "product",
            [
              "Bond",
              "Deposit",
              "IRS",
              "Cash",
              "CCS",
              "CDS",
              "CFD",
              "Option",
              "Other",
            ].map((v) => [v, v]),
          )}
          {select("Bank position", "side", [
            ["asset", "Asset / held"],
            ["liability", "Liability / issued"],
          ])}
          {select("Regulatory book (separate from IFRS 9)", "regulatoryBook", [
            ["banking", "Banking book"],
            ["trading", "Trading book"],
          ])}
          {number("Principal / reference notional (€)", "notional")}
          {number(
            "Opening consideration / signed derivative value (€)",
            "openingValue",
          )}
          <label>
            <FieldHint label="Contract maturity" />
            <input
              required
              type="date"
              value={p.maturity}
              onChange={(e) => update("maturity", e.target.value)}
            />
          </label>
          {select("Payment / reset frequency", "frequency", [
            ["1", "Monthly"],
            ["3", "Quarterly"],
            ["6", "Semiannual"],
            ["12", "Annual"],
          ])}
          {select("Rate type", "rateType", [
            ["fixed", "Fixed"],
            ["floating", "Floating"],
          ])}
          {number("Fixed coupon / fixed swap rate (%)", "coupon", true)}
          {number(
            "Current floating fixing (%) — first period locked",
            "fixing",
            true,
          )}
          {number("Floating margin (basis points)", "spreadBp")}
          {number("Discount credit spread (basis points)", "creditSpreadBp")}
          {p.product === "Deposit" &&
            select("Deposit contract", "depositType", [
              ["term", "Term deposit"],
              ["sight", "Sight deposit — behavioural"],
              ["call", "Call deposit — behavioural"],
            ])}
          {p.product === "IRS" && (
            <label>
              <FieldHint label="Swap direction" />
              <select
                value={String(p.payFixed)}
                onChange={(e) => update("payFixed", e.target.value === "true")}
              >
                <option value="true">Pay fixed / receive floating</option>
                <option value="false">Receive fixed / pay floating</option>
              </select>
            </label>
          )}
          {select("Accounting measurement", "treatment", [
            ["AC", "Amortised cost"],
            ["FVOCI", "FVOCI debt"],
            ["FVTPL", "FVTPL"],
            ["Unresolved", "Unresolved — risk retained"],
          ])}
          {select("SPPI assessment", "sppi", [
            ["pass", "Pass"],
            ["fail", "Fail"],
            ["unassessed", "Unassessed"],
          ])}
          {select("IFRS business model", "businessModel", [
            ["collect", "Hold to collect"],
            ["collect-sell", "Collect and sell"],
            ["other", "Trading / other"],
          ])}
          {select("Credit stage", "stage", [
            ["1", "Stage 1"],
            ["2", "Stage 2"],
          ])}
          {number("Annual PD assumption (%)", "pd", true)}
          {number("LGD assumption (%)", "lgd", true)}
          <label className="check">
            <input
              type="checkbox"
              checked={p.creditAssessed}
              onChange={(e) => update("creditAssessed", e.target.checked)}
            />
            <span>Credit inputs explicitly assessed for this scenario</span>
          </label>
        </div>
        <p className="notice">
          ACT/365 fixed, no business-day adjustment. Behavioural deposits
          require monthly payments at par. Imported model cash flows can supply
          otherwise unsupported products. Saving edits a draft; saved
          calculation runs remain unchanged.
        </p>
        <button type="submit">Save draft instrument</button>
      </form>
    </dialog>
  );
}
