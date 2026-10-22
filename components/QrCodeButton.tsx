"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

// "Show QR" button: opens a full-screen overlay with the sign-up QR code so people can scan it straight off the screen.
export default function QrCodeButton() {
  const [open, setOpen] = useState(false);
  const [img, setImg] = useState("");
  const url = typeof window !== "undefined" ? `${window.location.origin}/signup` : "";

  useEffect(() => {
    if (!open) return;
    QRCode.toDataURL(url, { width: 640, margin: 2, errorCorrectionLevel: "M" }).then(setImg).catch(() => setImg(""));
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, url]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Show the sign-up QR code on screen for people to scan"
        className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
      >
        Show QR code
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white p-6" onClick={() => setOpen(false)}>
          <p className="mb-4 text-center text-xl font-bold">Scan to join Coach In Mind</p>
          {img ? <img src={img} alt="Sign-up QR code" className="h-auto w-full max-w-md" /> : <p className="text-gray-500">Loading…</p>}
          <p className="mt-3 text-sm text-gray-500">{url.replace(/^https?:\/\//, "")}</p>
          <button type="button" onClick={() => setOpen(false)} className="mt-6 rounded-lg border border-gray-300 px-6 py-2 text-sm font-semibold hover:bg-gray-50">
            Close
          </button>
        </div>
      )}
    </>
  );
}
