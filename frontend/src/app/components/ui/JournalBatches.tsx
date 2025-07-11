"use client";

import React, { useState } from "react";
import { getAccountType } from "./utils/accountType";
import { ChevronDown, ChevronRight } from "lucide-react";

interface JournalEntry {
  entry_id: number;
  batch_id: number;
  entry_date: string;
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
  description: string;
  // ...other fields as needed
}

interface JournalBatch {
  batch_id: number;
  created_at: string;
  uploaded_by: string;
  entries: JournalEntry[];
}

export default function JournalBatches({ batches }: { batches: JournalBatch[] }) {
  const [openBatch, setOpenBatch] = useState<number | null>(null);

  const groupEntries = (entries: JournalEntry[]) => {
    const summary = {
      Asset: 0,
      Liability: 0,
      "Income Statement": 0,
      Other: 0,
    };
    for (const e of entries) {
      const type = getAccountType(e.account_code);
      const value = (e.debit || 0) - (e.credit || 0);
      summary[type] += value;
    }
    return summary;
  };

  return (
    <div className="space-y-8">
      {batches.map((batch) => {
        const summary = groupEntries(batch.entries);

        return (
          <div key={batch.batch_id} className="border p-4 rounded shadow">
            <div
              className="flex items-center cursor-pointer"
              onClick={() => setOpenBatch(openBatch === batch.batch_id ? null : batch.batch_id)}
            >
              {openBatch === batch.batch_id ? <ChevronDown /> : <ChevronRight />}
              <h3 className="ml-2 text-lg font-semibold">
                Batch #{batch.batch_id} — Uploaded {batch.created_at} by {batch.uploaded_by}
              </h3>
            </div>
            <div className="mt-3">
              <table className="w-full mb-2 border">
                <thead>
                  <tr className="bg-gray-100">
                    <th>Group</th>
                    <th>Net Total</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(summary).map(([group, total]) => (
                    <tr key={group}>
                      <td className="font-bold">{group}</td>
                      <td>{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {openBatch === batch.batch_id && (
                <div className="overflow-x-auto">
                  <table className="w-full border">
                    <thead>
                      <tr className="bg-blue-50">
                        <th>Date</th>
                        <th>Account Code</th>
                        <th>Account Name</th>
                        <th>Debit</th>
                        <th>Credit</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batch.entries.map((entry) => (
                        <tr key={entry.entry_id}>
                          <td>{entry.entry_date}</td>
                          <td>{entry.account_code}</td>
                          <td>{entry.account_name}</td>
                          <td>{entry.debit || ""}</td>
                          <td>{entry.credit || ""}</td>
                          <td>{entry.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
