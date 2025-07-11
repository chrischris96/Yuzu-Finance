"use client";

import React, { useRef, useState } from "react";
import { CloudUpload } from "lucide-react";

export default function CsvUpload({
  onUploadSuccess,
}: {
  onUploadSuccess?: (msg: string) => void;
}) {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function uploadFile(file: File) {
    setUploading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:8000/upload_journal_entries", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(result.message || "Upload successful!");
        onUploadSuccess?.(result.message || "Upload successful!");
      } else {
        setMessage(result.detail || "Upload failed.");
      }
    } catch (e) {
      setMessage("Network error: could not upload.");
    }
    setUploading(false);
  }

  function handleDrag(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFileName(e.dataTransfer.files[0].name);
      uploadFile(e.dataTransfer.files[0]);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      setFileName(e.target.files[0].name);
      uploadFile(e.target.files[0]);
    }
  }

  function openFileDialog() {
    inputRef.current?.click();
  }

  return (
    <div className="flex flex-col items-center w-full">
      <div
        className={`w-full max-w-md h-44 border-4 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer
          transition-all duration-300
          ${dragActive ? "border-pink-500 bg-pink-50 shadow-lg scale-105" : "border-blue-400 bg-white/80"}
        `}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
        tabIndex={0}
        role="button"
        aria-label="Upload CSV"
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleChange}
        />
        <div className="flex flex-col items-center">
          <div className={`mb-2 ${dragActive ? "animate-bounce" : ""}`}>
            <CloudUpload className={`${dragActive ? "text-pink-600" : "text-blue-500"} w-12 h-12 transition-colors`} />
          </div>
          <div className="text-lg font-semibold text-blue-600">
            {fileName ? (
              <>
                <span className="font-bold">{fileName}</span> selected
              </>
            ) : (
              <>
                <span className="text-gray-800">Drag and drop</span>
                <span className="mx-1 text-pink-500 font-bold">CSV</span>
                <span className="text-gray-800">file here</span>
                <br />
                <span className="text-gray-400 text-sm font-normal">or click to select</span>
              </>
            )}
          </div>
        </div>
      </div>
      <button
        onClick={openFileDialog}
        className={`
          mt-5 px-7 py-2.5 rounded-2xl text-white text-lg font-bold shadow-lg
          bg-gradient-to-tr from-pink-500 via-blue-500 to-violet-500
          hover:from-pink-600 hover:via-blue-600 hover:to-violet-600
          transition-all duration-200
          animate-pulse
        `}
        type="button"
        disabled={uploading}
      >
        {uploading ? "Uploading..." : fileName ? "Change CSV" : "Upload CSV"}
      </button>
      {/* Message display */}
      {message && (
        <div className={`mt-4 text-center text-base ${message.includes("success") ? "text-green-600" : "text-red-500"}`}>
          {message}
        </div>
      )}
    </div>
  );
}
