"use client";

import { useState } from "react";

type JournalRow = {
  entry_date: string;
  doc_number: string;
  line_number: string;
  account_code: string;
  account_name: string;
  debit: string;
  credit: string;
  description: string;
  currency: string;
  cost_center: string;
  entry_type: string;
  [key: string]: string; // index signature for string keys
};

export default function JournalTable() {
  const [rows, setRows] = useState<JournalRow[]>([
    {
      entry_date: "",
      doc_number: "",
      line_number: "",
      account_code: "",
      account_name: "",
      debit: "",
      credit: "",
      description: "",
      currency: "",
      cost_center: "",
      entry_type: "",
    },
  ]);

  const handleChange = (index: number, field: string, value: string) => {
    const updated = [...rows];
    updated[index][field] = value;
    setRows(updated);
  };

  const addRow = () => {
    setRows([...rows, { ...rows[0] }]);
  };

  const submit = async () => {
    const payload = rows.map((row) => ({
      ...row,
      debit: row.debit ? parseFloat(row.debit) : null,
      credit: row.credit ? parseFloat(row.credit) : null,
      line_number: row.line_number ? parseInt(row.line_number) : null,
    }));

    const res = await fetch("http://localhost:8000/journal-entries", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    alert(data.message);
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Manual Journal Entry</h2>
      <table className="w-full text-sm">
        <thead className="bg-gray-100">
          <tr>
            {Object.keys(rows[0]).map((key) => (
              <th key={key} className="border p-2">{key}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {Object.keys(row).map((key) => (
                <td key={key} className="border p-1">
                  <input
                    type="text"
                    value={row[key] ?? ""}
                    onChange={(e) => handleChange(i, key, e.target.value)}
                    className="w-full p-1"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={addRow} className="mt-4 bg-blue-500 text-white px-3 py-2 rounded">
        Add Row
      </button>
      <button onClick={submit} className="mt-4 ml-4 bg-green-600 text-white px-3 py-2 rounded">
        Submit
      </button>
    </div>
  );
}
