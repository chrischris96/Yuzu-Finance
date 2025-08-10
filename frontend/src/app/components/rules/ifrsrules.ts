// components/rules/ifrsRules.ts

export type IFRSRule = {
  id: string;
  title: string;
  standard: string;     // e.g., "IFRS 15"
  ref: string;          // e.g., "15.31–35, B34–B38"
  summary: string;      // short, plain-English rationale
  tests?: string[];     // key tests / decision bullets
  typicalJE?: string[]; // examples of lines the rule addresses
  notes?: string;       // caveats, edge cases
};

export const IFRS_RULES: Record<string, IFRSRule> = {
  REVENUE_GOODS: {
    id: "REVENUE_GOODS",
    title: "Revenue – Transfer of Goods",
    standard: "IFRS 15",
    ref: "15.31–38, B34–B38",
    summary:
      "Recognize revenue when control of the promised goods transfers to the customer (point in time), net of variable consideration to the extent it’s highly probable no significant reversal will occur.",
    tests: [
      "Has control transferred (legal title, physical possession, risks/rewards, acceptance)?",
      "Identify performance obligations & transaction price allocation.",
      "Constrain variable consideration where needed."
    ],
    typicalJE: [
      "Dr Contract asset / A/R; Cr Revenue",
      "Dr Refund liability; Cr Revenue (variable consideration constraint)",
      "Dr COGS; Cr Inventory"
    ]
  },

  REVENUE_SERVICES: {
    id: "REVENUE_SERVICES",
    title: "Revenue – Services Over Time",
    standard: "IFRS 15",
    ref: "15.31–35, 38–41, B14–B19",
    summary:
      "Recognize revenue over time if the customer simultaneously receives and consumes the benefits, or if the asset has no alternative use and there’s an enforceable right to payment.",
    tests: [
      "Does the customer receive benefits as you perform?",
      "Is there an enforceable right to payment for performance completed to date?",
      "Choose an appropriate measure of progress (input/output)."
    ],
    typicalJE: [
      "Dr Contract asset / A/R; Cr Revenue (over time)",
      "Adjust measure of progress each period"
    ]
  },

  VARIABLE_CONSIDERATION: {
    id: "VARIABLE_CONSIDERATION",
    title: "Variable Consideration & Constraint",
    standard: "IFRS 15",
    ref: "15.50–59, B63–B63B",
    summary:
      "Estimate variable amounts (discounts, rebates, bonuses) and include only the amount for which it’s highly probable there will be no significant revenue reversal.",
    tests: [
      "Pick method: expected value or most likely amount",
      "Apply constraint and update estimates each period"
    ],
    typicalJE: [
      "Dr Revenue; Cr Refund liability (for expected rebates)",
      "Re-measure and true-up at period end"
    ]
  },

  CONTRACT_COSTS: {
    id: "CONTRACT_COSTS",
    title: "Contract Costs – Capitalize Incremental Costs",
    standard: "IFRS 15",
    ref: "15.91–104",
    summary:
      "Capitalize incremental costs of obtaining a contract if recoverable; amortize consistently with transfer of related goods/services.",
    tests: [
      "Costs are incremental and recoverable",
      "Amortize on a systematic basis aligned to revenue"
    ],
    typicalJE: ["Dr Contract cost asset; Cr Cash/AP", "Dr Amortization; Cr Contract cost asset"]
  },

  DEFERRED_REVENUE: {
    id: "DEFERRED_REVENUE",
    title: "Contract Liabilities (Deferred Revenue)",
    standard: "IFRS 15",
    ref: "15.26, 60–65, 106–108",
    summary:
      "Record a contract liability when you receive consideration before transferring goods/services; recognize revenue when you satisfy the performance obligation.",
    typicalJE: [
      "Dr Cash; Cr Contract liability",
      "Dr Contract liability; Cr Revenue (when satisfied)"
    ]
  },

  LEASE_LESSEE: {
    id: "LEASE_LESSEE",
    title: "Lessee – ROU & Lease Liability",
    standard: "IFRS 16",
    ref: "16.22–28, 36–38",
    summary:
      "Initial recognition of a right-of-use asset and a lease liability at the present value of lease payments; subsequent interest on liability and amortization of ROU asset.",
    tests: [
      "Identify lease term incl. options reasonably certain to exercise",
      "Determine discount rate (implicit or incremental borrowing rate)"
    ],
    typicalJE: [
      "Dr ROU asset; Cr Lease liability (initial)",
      "Dr Interest exp; Cr Lease liability",
      "Dr Amortization; Cr ROU asset"
    ]
  },

  LEASE_MODIFICATION: {
    id: "LEASE_MODIFICATION",
    title: "Lease Modification – Lessee",
    standard: "IFRS 16",
    ref: "16.44–46",
    summary:
      "Re-measure lease liability using a revised discount rate when terms change; treat as separate lease if it adds the right to use one or more assets at standalone price.",
    typicalJE: ["Re-measure liability; adjust ROU asset or P&L per modification type"]
  },

  PPE_ADD: {
    id: "PPE_ADD",
    title: "PPE – Initial Recognition",
    standard: "IAS 16",
    ref: "16.6–7, 16–22",
    summary:
      "Capitalize directly attributable costs to bring an item to the location and condition necessary for it to operate as intended.",
    typicalJE: ["Dr PPE; Cr Cash/AP", "Capitalize dismantling obligations (provision) to cost"]
  },

  PPE_DEP: {
    id: "PPE_DEP",
    title: "PPE – Depreciation",
    standard: "IAS 16",
    ref: "16.50–62",
    summary:
      "Systematic allocation of depreciable amount over useful life; review residual value and useful life annually.",
    typicalJE: ["Dr Depreciation; Cr Accumulated depreciation"]
  },

  IMPAIRMENT_NONFIN: {
    id: "IMPAIRMENT_NONFIN",
    title: "Impairment – Non-financial Assets",
    standard: "IAS 36",
    ref: "36.8–17, 59–64",
    summary:
      "Test for impairment when indicators exist; write down to the higher of fair value less costs of disposal and value in use.",
    typicalJE: ["Dr Impairment loss; Cr Asset / Accumulated impairment"]
  },

  INTANGIBLE_ADD: {
    id: "INTANGIBLE_ADD",
    title: "Intangible Assets – Recognition",
    standard: "IAS 38",
    ref: "38.18–28, 57–67",
    summary:
      "Recognize an intangible if identifiable, controlled, and future benefits probable; expense most research; capitalize development if criteria met.",
    typicalJE: ["Dr Intangible asset; Cr Cash/AP", "Dr R&D expense (research phase)"]
  },

  INVENTORY: {
    id: "INVENTORY",
    title: "Inventory – Cost & NRV",
    standard: "IAS 2",
    ref: "2.10–25, 34–36",
    summary:
      "Measure at the lower of cost and net realizable value; include purchase and conversion costs; exclude abnormal waste.",
    typicalJE: ["Dr Inventory; Cr Cash/AP", "Dr Write-down exp; Cr Inventory"]
  },

  PROVISIONS: {
    id: "PROVISIONS",
    title: "Provisions",
    standard: "IAS 37",
    ref: "37.14–26, 59–68",
    summary:
      "Recognize a provision for a present obligation (legal/constructive) with a reliable estimate and probable outflow.",
    typicalJE: ["Dr Expense; Cr Provision", "Discount long-term where material"]
  },

  CONTINGENT_LIAB: {
    id: "CONTINGENT_LIAB",
    title: "Contingent Liabilities – Disclose, Don’t Recognize",
    standard: "IAS 37",
    ref: "37.86–92",
    summary: "Disclose contingent liabilities unless the possibility of outflow is remote.",
  },

  EMP_BEN_SHORT: {
    id: "EMP_BEN_SHORT",
    title: "Short-term Employee Benefits (Bonus/Accrual)",
    standard: "IAS 19",
    ref: "19.11, 17–19, 53–54",
    summary:
      "Accrue when the employee has rendered service and the amount can be measured reliably; discounting generally not required for short-term.",
    typicalJE: ["Dr Staff costs; Cr Accrued expenses / Bonus payable"]
  },

  SHARE_BASED: {
    id: "SHARE_BASED",
    title: "Share-based Payment",
    standard: "IFRS 2",
    ref: "2.7–15, 19–27",
    summary:
      "Recognize fair value of equity instruments granted to employees over the vesting period with corresponding equity or liability depending on settlement.",
    typicalJE: ["Dr Staff costs; Cr Equity (share-based payment reserve)"]
  },

  TAX_CURRENT: {
    id: "TAX_CURRENT",
    title: "Income Taxes – Current",
    standard: "IAS 12",
    ref: "12.12–14",
    summary:
      "Recognize current tax payable or receivable for the current and prior periods based on taxable profit/loss.",
    typicalJE: ["Dr Income tax expense; Cr Income tax payable"]
  },

  TAX_DEFERRED: {
    id: "TAX_DEFERRED",
    title: "Income Taxes – Deferred",
    standard: "IAS 12",
    ref: "12.15–24, 34–36",
    summary:
      "Recognize deferred tax for temporary differences unless specific exceptions apply; measure using enacted/substantively enacted rates.",
    typicalJE: ["Dr/Cr Deferred tax expense; Cr/Dr Deferred tax asset/liability"]
  },

  FX_IAS21: {
    id: "FX_IAS21",
    title: "Foreign Currency – Monetary Items",
    standard: "IAS 21",
    ref: "21.21–28, 32–39",
    summary:
      "Translate monetary items at closing rate; recognize FX differences in P&L unless hedge/accounting policy requires otherwise.",
    typicalJE: ["Dr/Cr FX loss/gain; Cr/Dr Monetary item"]
  },

  BORROWING_COSTS: {
    id: "BORROWING_COSTS",
    title: "Borrowing Costs – Capitalization",
    standard: "IAS 23",
    ref: "23.8–12, 17–22",
    summary:
      "Capitalize borrowing costs directly attributable to the acquisition/construction of a qualifying asset until ready for use/sale.",
    typicalJE: ["Dr PPE/Intangible (capitalized interest); Cr Interest payable"]
  },

  GOV_GRANTS: {
    id: "GOV_GRANTS",
    title: "Government Grants",
    standard: "IAS 20",
    ref: "20.7–12, 24",
    summary:
      "Recognize when there is reasonable assurance that conditions will be met and the grant will be received; present as income or deduct from related asset.",
    typicalJE: ["Dr Cash/Receivable; Cr Deferred income", "Release to P&L over related costs"]
  },

  FINANCIAL_ASSETS_CLASS: {
    id: "FINANCIAL_ASSETS_CLASS",
    title: "Financial Assets – Classification",
    standard: "IFRS 9",
    ref: "9.4.1.1–4.1.4",
    summary:
      "Classify based on business model and cash flow characteristics (SPPI) into amortized cost, FVOCI, or FVTPL.",
  },

  ECL: {
    id: "ECL",
    title: "Expected Credit Loss (ECL)",
    standard: "IFRS 9",
    ref: "9.5.5.3–5.5.5",
    summary:
      "Recognize 12-month ECL on initial recognition; move to lifetime ECL on significant increase in credit risk; simplified approach for trade receivables.",
    typicalJE: ["Dr Impairment loss; Cr Loss allowance (contra A/R)"]
  },

  HEDGE: {
    id: "HEDGE",
    title: "Hedge Accounting",
    standard: "IFRS 9",
    ref: "9.6.4.1–6.5.16",
    summary:
      "Qualifying hedge relationships align accounting with risk management; defer effective portion in OCI for cash flow hedges.",
  },

  BUSINESS_COMB: {
    id: "BUSINESS_COMB",
    title: "Business Combinations",
    standard: "IFRS 3",
    ref: "3.18–19, 32–36",
    summary:
      "Acquisition method: recognize identifiable assets/liabilities at fair value; goodwill as residual; expense acquisition-related costs.",
  },

  CONSOLIDATION: {
    id: "CONSOLIDATION",
    title: "Consolidation – Control Model",
    standard: "IFRS 10",
    ref: "10.7–8, B38–B46",
    summary:
      "Consolidate when you have power over investee, exposure/rights to variable returns, and ability to affect those returns.",
  },

  EQUITY_METHOD: {
    id: "EQUITY_METHOD",
    title: "Associates – Equity Method",
    standard: "IAS 28",
    ref: "28.10–14, 26–28",
    summary:
      "Recognize share of profit or loss in P&L; adjust carrying amount for share of OCI and distributions.",
  }
};
