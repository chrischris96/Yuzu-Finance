import { Report, totals, groupName } from "@/lib/reporting";
import { money } from "@/lib/accounting";
export default function LedgerTable({ report }: { report: Report }) {
  const rows = [...new Set(report.entries.map((e) => e.code))].map((code) => {
    const entries = report.entries.filter((e) => e.code === code);
    return {
      code,
      label: entries[0].label,
      group: entries[0].group,
      ...totals(entries, report.previous),
    };
  });
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Account code</th>
            <th>Account</th>
            <th>Statement line</th>
            <th>Opening</th>
            <th>Period debit</th>
            <th>Period credit</th>
            <th>Closing debit</th>
            <th>Closing credit</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.code}>
              <td>{r.code}</td>
              <td>{r.label}</td>
              <td>{groupName(r.group)}</td>
              <td>{money(r.opening)}</td>
              <td>{money(r.debit)}</td>
              <td>{money(r.credit)}</td>
              <td>{money(Math.max(0, r.closing))}</td>
              <td>{money(Math.max(0, -r.closing))}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th colSpan={4}>Total</th>
            <td>{money(rows.reduce((s, r) => s + r.debit, 0))}</td>
            <td>{money(rows.reduce((s, r) => s + r.credit, 0))}</td>
            <td>
              {money(rows.reduce((s, r) => s + Math.max(0, r.closing), 0))}
            </td>
            <td>
              {money(rows.reduce((s, r) => s + Math.max(0, -r.closing), 0))}
            </td>
          </tr>
        </tfoot>
      </table>
      <p>
        Trial balance includes income and expense accounts; the statement rolls
        their result into equity. All four views derive from the same postings.
      </p>
    </div>
  );
}
