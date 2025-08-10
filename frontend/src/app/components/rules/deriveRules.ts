// app/components/rules/deriveRule.ts
import { IFRS_RULES } from "./ifrsrules";

export type RuleId = keyof typeof IFRS_RULES;

type RowLike = {
  account_code?: string;
  account_name?: string;
  description?: string;
};

export function deriveRuleIdFromRow(row: RowLike): RuleId | null {
  const name = (row.account_name ?? "").toLowerCase();
  const code = (row.account_code ?? "").toLowerCase();
  const desc = (row.description ?? "").toLowerCase();
  const acct = `${name} ${code} ${desc}`;

  // very light heuristics for MVP – tweak freely
  if (/defer|contract liab|unearned/.test(acct)) return "DEFERRED_REVENUE";
  if (/service/.test(acct)) return "REVENUE_SERVICES";
  if (/revenue|sales|product/.test(acct)) return "REVENUE_GOODS";

  if (/depreciation|accumulated/.test(acct)) return "PPE_DEP";
  if (/ppe|machinery|equipment|property|plant/.test(acct)) return "PPE_ADD";
  if (/impair/.test(acct)) return "IMPAIRMENT_NONFIN";
  if (/inventory|stock/.test(acct)) return "INVENTORY";

  if (/lease|rou/.test(acct)) return "LEASE_LESSEE";
  if (/bonus|wage|salary/.test(acct)) return "EMP_BEN_SHORT";

  if (/tax/.test(acct) && /defer/.test(acct)) return "TAX_DEFERRED";
  if (/tax/.test(acct)) return "TAX_CURRENT";

  if (/grant/.test(acct)) return "GOV_GRANTS";
  if (/fx|foreign/.test(acct)) return "FX_IAS21";
  if (/provision|reserve/.test(acct)) return "PROVISIONS";

  return null;
}
