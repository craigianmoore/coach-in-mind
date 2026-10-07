"use client";

import { useEffect, useState } from "react";

// Preview of a file the person has just chosen (image or PDF), shown
// before they save. Uses a temporary local URL — nothing is uploaded.
export default function FilePreview({ file }: { file: File | null }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  if (!file || !url) return null;
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  return (
    <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-2">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Preview — {file.name}</span>
        <a href={url} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-700 underline">
          Open full size
        </a>
      </div>
      {isPdf ? (
        <iframe src={url} title="Preview of selected file" className="mt-2 h-72 w-full rounded border bg-white" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="Preview of selected file" className="mt-2 max-h-72 w-auto rounded border bg-white" />
      )}
    </div>
  );
}
