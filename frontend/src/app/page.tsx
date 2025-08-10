"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/app/components/ui/tabs";
import UploadJournal from "@/app/components/ui/CsvUpload";

import { useRouter } from "next/navigation";
// app/journal/page.tsx  (example snippet)
import RuleTooltip from "@/app/components/rules/RuleTooltip";

export function JournalPage() {
  // Example data
  const rows = [
    { id: 1, account: "4000 – Product revenue", amount: 125000, rule: "REVENUE_GOODS" as const },
    { id: 2, account: "2100 – Contract liability", amount: 48000, rule: "DEFERRED_REVENUE" as const },
    { id: 3, account: "6110 – Depreciation expense", amount: 7200, rule: "PPE_DEP" as const },
  ];

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="text-2xl font-semibold">Journal Entries</h1>

      <div className="mt-6 overflow-hidden rounded-xl border">
        <table className="w-full border-separate border-spacing-0">
          <thead className="bg-neutral-50 text-left text-sm">
            <tr>
              <th className="px-4 py-3 font-medium">Account</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Rule</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-3">{r.account}</td>
                <td className="px-4 py-3 tabular-nums">{r.amount.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <RuleTooltip ruleId={r.rule} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

// Removed duplicate default export SomeProtectedPage to fix redeclaration error.
import MetricsWidget from "@/app/components/ui/MetricsWidget";
import HowItWorks from "@/app/components/ui/HowItWorks";

// Removed HomePage default export to avoid duplicate default export error.
// The content from HomePage can be merged into the main Home component if needed.


import { deriveRuleIdFromRow, type RuleId } from "@/app/components/rules/deriveRules";

interface JournalEntry {
  entry_id?: number;
  entry_date: string;
  account_code: string;
  account_name: string;
  debit?: number | null;
  credit?: number | null;
  description: string;
  currency?: string;
  cost_center?: string;
  entry_type?: string;
  rule_id?: RuleId | null; // <— NEW
}


interface JournalBatch {
  batch_id: number;
  uploaded_at: string;
  uploaded_by: string;
  entries: JournalEntry[];
}

interface USGaapSummary {
  account_code: string;
  debit: number;
  credit: number;
}

export default function Home() {
  const [batches, setBatches] = useState<JournalBatch[]>([]);
  const [summary, setSummary] = useState<USGaapSummary[]>([]);
  const [rows, setRows] = useState<JournalEntry[]>([
    {
      entry_date: "",
      account_code: "",
      account_name: "",
      debit: null,
      credit: null,
      description: "",
      currency: "",
      cost_center: "",
      entry_type: "",
    },
  ]);

  // Fetch journal batches
  useEffect(() => {
    fetch("http://localhost:8000/journal_batches")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setBatches(data);
        } else {
          setBatches([]);
        }
      })
      .catch(() => setBatches([]));
  }, []);

  // Fetch US GAAP summary
  useEffect(() => {
    fetch("http://localhost:8000/us_gaap_summary")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setSummary(data);
        } else {
          setSummary([]);
        }
      })
      .catch(() => setSummary([]));
  }, []);

  const handleChange = (index: number, field: string, value: string) => {
    const updated = [...rows];

    switch (field) {
      case "debit":
      case "credit":
        (updated[index] as any)[field] =
          value === "" ? null : parseFloat(value);
        break;
      default:
        (updated[index] as any)[field] = value;
        break;
    }

    setRows(updated);
  };

  const addRow = () => {
    setRows([
      ...rows,
      {
        entry_date: "",
        account_code: "",
        account_name: "",
        debit: null,
        credit: null,
        description: "",
        currency: "",
        cost_center: "",
        entry_type: "",
      },
    ]);
  };

const handleSubmit = async () => {
  // Check rows
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row.entry_date) {
      alert(`Row ${i + 1}: Entry Date is required.`);
      return;
    }
    if (!row.account_code) {
      alert(`Row ${i + 1}: Account Code is required.`);
      return;
    }
    if (!row.account_name) {
      alert(`Row ${i + 1}: Account Name is required.`);
      return;
    }
    if (!row.debit && !row.credit) {
      alert(`Row ${i + 1}: Either Debit or Credit must be filled.`);
      return;
    }
    if (!row.description) {
      alert(`Row ${i + 1}: Description is required.`);
      return;
    }
  }

  try {
const payload = rows.map(r => ({
  ...r,
  rule_id: r.rule_id ?? deriveRuleIdFromRow(r)
}));

    const response = await fetch("http://localhost:8000/journal_entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      alert("Entries saved successfully!");
      setRows([]);
    } else {
      const error = await response.json();
      console.error(error);
      alert(
        error.detail?.[0]?.msg ||
        JSON.stringify(error, null, 2) ||
        "Unknown error."
      );
    }
  } catch (e) {
    alert("Failed to save entries: " + e);
  }
};



  return (
    <main className="min-h-screen bg-gray-50 p-8 space-y-12">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        Journal Entry Management
      </h1>

      <Tabs defaultValue="upload" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          <TabsTrigger value="journal">Journal Batches</TabsTrigger>
          <TabsTrigger value="summary">US GAAP Summary</TabsTrigger>
        </TabsList>

        {/* Upload Tab */}
        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle>Upload Journal Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <UploadJournal onUploadSuccess={(msg: string) => { /* handle upload success */ }} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manual Entry Tab */}
        <TabsContent value="manual">
          <Card>
            <CardHeader>
              <CardTitle>Manual Journal Entry</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="min-w-full text-sm border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 border">Date</th>
                    <th className="p-2 border">Account Code</th>
                    <th className="p-2 border">Account Name</th>
                    <th className="p-2 border">Debit</th>
                    <th className="p-2 border">Credit</th>
                    <th className="p-2 border">Description</th>
                    <th className="p-2 border">IFRS Rule</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i}>
                      <td className="border">
                        <input
                          type="date"
                          value={row.entry_date}
                          onChange={(e) =>
                            handleChange(i, "entry_date", e.target.value)
                          }
                          className="p-1 w-full"
                        />
                      </td>
                      <td className="border">
                        <input
                          value={row.account_code}
                          onChange={(e) =>
                            handleChange(i, "account_code", e.target.value)
                          }
                          className="p-1 w-full"
                        />
                      </td>
                      <td className="border">
                        <input
                          value={row.account_name}
                          onChange={(e) =>
                            handleChange(i, "account_name", e.target.value)
                          }
                          className="p-1 w-full"
                        />
                      </td>
                      <td className="border">
                        <input
                          type="number"
                          value={row.debit ?? ""}
                          onChange={(e) =>
                            handleChange(i, "debit", e.target.value)
                          }
                          className="p-1 w-full"
                        />
                      </td>
                      <td className="border">
                        <input
                          type="number"
                          value={row.credit ?? ""}
                          onChange={(e) =>
                            handleChange(i, "credit", e.target.value)
                          }
                          className="p-1 w-full"
                        />
                      </td>
                      <td className="border">
                        <input
                          value={row.description}
                          onChange={(e) =>
                            handleChange(i, "description", e.target.value)
                          }
                          className="p-1 w-full"
                        />
                      </td>
<td className="p-2 border">
  {(() => {
    const ruleId = row.rule_id ?? deriveRuleIdFromRow(row);
    return ruleId ? <RuleTooltip ruleId={ruleId} /> : <span className="text-neutral-400">—</span>;
  })()}
</td>

                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-4 space-x-2">
                <button
                  onClick={addRow}
                  className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                >
                  Add Row
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Submit
                </button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Journal Batches Tab */}
        <TabsContent value="journal">
          <div className="space-y-8">
            {batches.length === 0 && (
              <p className="text-gray-600">
                No journal batches uploaded yet.
              </p>
            )}
            {batches.map((batch) => (
              <div
                key={batch.batch_id}
                className="border border-gray-300 rounded p-4"
              >
                <h3 className="text-lg font-semibold mb-2">
                  Batch #{batch.batch_id} — {batch.uploaded_at}
                </h3>
                <table className="min-w-full text-sm border">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="p-2 border">Date</th>
                      <th className="p-2 border">Account</th>
                      <th className="p-2 border">Debit</th>
                      <th className="p-2 border">Credit</th>
                      <th className="p-2 border">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batch.entries?.map((entry) => (
                      <tr key={entry.entry_id}>
                        <td className="p-2 border">
                          {entry.entry_date}
                        </td>
                        <td className="p-2 border">
                          {entry.account_name}
                        </td>
                        <td className="p-2 border">
                          {entry.debit?.toFixed(2) ?? ""}
                        </td>
                        <td className="p-2 border">
                          {entry.credit?.toFixed(2) ?? ""}
                        </td>
                        <td className="p-2 border">
                          {entry.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* US GAAP Summary Tab */}
        <TabsContent value="summary">
          <Card>
            <CardHeader>
              <CardTitle>Balance Sheet Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {summary.length === 0 ? (
                <p className="text-gray-600">No data available.</p>
              ) : (
                <table className="min-w-full text-sm border">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="p-2 border">Account Code</th>
                      <th className="p-2 border">Debit</th>
                      <th className="p-2 border">Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.map((row) => (
                      <tr key={row.account_code}>
                        <td className="p-2 border">
                          {row.account_code}
                        </td>
                        <td className="p-2 border">
                          {row.debit?.toFixed(2)}
                        </td>
                        <td className="p-2 border">
                          {row.credit?.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
