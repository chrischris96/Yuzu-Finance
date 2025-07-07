"use client";

import { useState } from "react";

export default function UploadJournal() {
  const [message, setMessage] = useState("");

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("http://localhost:8000/upload-journal-entries", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    console.log(data);
    setMessage(`${data.success_count} entries uploaded`);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Upload Journal Entries</h2>
      <input type="file" accept=".csv" onChange={handleUpload} />
      <p>{message}</p>
    </div>
  );
}
