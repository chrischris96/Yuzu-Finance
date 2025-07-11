// utils/accountType.ts
export function getAccountType(account_code: string) {
  if (account_code.startsWith("1")) return "Asset";
  if (account_code.startsWith("2")) return "Liability";
  if (account_code.startsWith("3") || account_code.startsWith("4") || account_code.startsWith("5")) return "Income Statement";
  return "Other";
}
