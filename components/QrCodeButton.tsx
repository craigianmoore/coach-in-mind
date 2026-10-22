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
    let cancelled = false;
    (async () => {
      try {
        // High error correction so the logo can cover the centre and the code still scans.
        const canvas = document.createElement("canvas");
        await QRCode.toCanvas(canvas, url, { width: 640, margin: 2, errorCorrectionLevel: "H" });
        const plain = canvas.toDataURL("image/png");
        try {
          const logo = new Image();
          logo.src = "/coach-in-mind-logo.png";
          await logo.decode();
          const ctx = canvas.getContext("2d")!;
          const box = canvas.width * 0.24; // ~6% of the code area, well inside H-level recovery
          const x = (canvas.width - box) / 2;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(x - 8, x - 8, box + 16, box + 16);
          const scale = Math.min(box / logo.naturalWidth, box / logo.naturalHeight);
          const w = logo.naturalWidth * scale, h = logo.naturalHeight * scale;
          ctx.drawImage(logo, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
          if (!cancelled) setImg(canvas.toDataURL("image/png"));
        } catch {
          if (!cancelled) setImg(plain); // logo failed to load: plain code still works
        }
      } catch {
        if (!cancelled) setImg("");
      }
    })();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => { cancelled = true; window.removeEventListener("keydown", onKey); };
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
