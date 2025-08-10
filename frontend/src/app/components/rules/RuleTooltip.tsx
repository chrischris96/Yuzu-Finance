// components/rules/RuleTooltip.tsx
"use client";

import * as React from "react";
import { IFRS_RULES, IFRSRule } from "./ifrsrules";

type Props = {
  ruleId: keyof typeof IFRS_RULES;
  children?: React.ReactNode; // optional custom trigger
  className?: string;
  side?: "top" | "right" | "bottom" | "left";
};

export default function RuleTooltip({
  ruleId,
  children,
  className = "",
  side = "top",
}: Props) {
  const rule: IFRSRule | undefined = IFRS_RULES[ruleId];
  if (!rule) return null;

  const sideClasses =
    side === "top"
      ? "bottom-full left-1/2 -translate-x-1/2 -translate-y-2"
      : side === "right"
      ? "left-full top-1/2 -translate-y-1/2 translate-x-2"
      : side === "bottom"
      ? "top-full left-1/2 -translate-x-1/2 translate-y-2"
      : "right-full top-1/2 -translate-y-1/2 -translate-x-2";

  return (
    <span className={`relative inline-flex group ${className}`}>
      {children ?? (
        <button
          type="button"
          aria-label="Show IFRS rule"
          className="inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold hover:bg-neutral-50"
        >
          i
        </button>
      )}

      {/* Tooltip panel */}
      <div
        role="tooltip"
        className={`pointer-events-none invisible absolute z-50 w-80 max-w-[22rem] rounded-xl border bg-white p-3 text-sm shadow-2xl ring-1 ring-black/5 transition-all duration-150 group-hover:visible ${sideClasses}`}
      >
        <div className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">
          {rule.standard} — {rule.ref}
        </div>
        <div className="text-[13px] leading-5">
          <div className="font-semibold">{rule.title}</div>
          <p className="mt-1 text-neutral-700">{rule.summary}</p>

          {rule.tests?.length ? (
            <>
              <div className="mt-2 text-xs font-medium text-neutral-600">Key tests</div>
              <ul className="mt-1 list-disc pl-5 text-neutral-700">
                {rule.tests.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </>
          ) : null}

          {rule.typicalJE?.length ? (
            <>
              <div className="mt-2 text-xs font-medium text-neutral-600">Typical JEs</div>
              <ul className="mt-1 list-disc pl-5 text-neutral-700">
                {rule.typicalJE.map((t, i) => (
                  <li key={i}>
                    <code className="rounded bg-neutral-50 px-1 py-0.5">{t}</code>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {rule.notes ? (
            <p className="mt-2 text-[12px] text-neutral-500">{rule.notes}</p>
          ) : null}

          <div className="mt-2 text-[11px] text-neutral-400">
            Reference shorthand is provided for navigation only. This is not legal or accounting advice.
          </div>
        </div>
      </div>
    </span>
  );
}
