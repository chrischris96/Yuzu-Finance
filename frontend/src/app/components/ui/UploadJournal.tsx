"use client";

import React, { useRef, useState } from "react";
import { CloudUpload } from "lucide-react"; // If you have lucide-react. Else swap for SVG below

export default function UploadJournal({ onUpload }: { onUpload?: (file: File) => void }) {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  function handleDrag(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFileName(e.dataTransfer.files[0].name);
      onUpload?.(e.dataTransfer.files[0]);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      setFileName(e.target.files[0].name);
      onUpload?.(e.target.files[0]);
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
          {/* Animated icon */}
          <div className={`mb-2 ${dragActive ? "animate-bounce" : ""}`}>
            {/* Lucide icon (preferred, if you use lucide-react) */}
            <CloudUpload className={`${dragActive ? "text-pink-600" : "text-blue-500"} w-12 h-12 transition-colors`} />
            {/* If you don't have lucide-react, use this SVG instead:
            <svg className={`${dragActive ? "text-pink-600" : "text-blue-500"} w-12 h-12 transition-colors`} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V7m0 0l-3.5 3.5M12 7l3.5 3.5" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 16.875A4.125 4.125 0 0116.125 21H7.875A4.125 4.125 0 013.75 16.875a4.07 4.07 0 01.697-2.29M16.5 16.5a2.25 2.25 0 10-4.5 0" />
            </svg>
            */}
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
      {/* Animated colorful upload button */}
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
      >
        {fileName ? "Change CSV" : "Upload CSV"}
      </button>
    </div>
  );
}
