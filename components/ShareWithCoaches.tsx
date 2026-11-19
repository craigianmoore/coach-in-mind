"use client";

import { useState } from "react";
import QrCodeButton from "@/components/QrCodeButton";
import { shareJoinByText } from "@/lib/shareBlurb";

// A card on the signed-in front pages so a coach can hand Coach In Mind to another coach: show the sign-up QR code
// on screen to scan, or send the sign-up link by text or the phone's share sheet.
export default function ShareWithCoaches() {
  const [msg, setMsg] = useState("");
  async function send() {
    const r = await shareJoinByText(window.location.origin);
    setMsg(r === "copied" ? "Copied. Paste it into a message." : "");
  }
  return (
    <div className="col-span-full rounded-xl border bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold">Know another coach who&apos;d like to be matched?</h2>
      <p className="mt-2 text-sm text-gray-600">
        Show them the QR code to scan, or send them the link. Founding coaches get a free credit while places last, and a club&apos;s first introduction is free.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <QrCodeButton label="Show QR code" className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-semibold text-white hover:opacity-90" />
        <button type="button" onClick={send} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
          Send the link
        </button>
        {msg && <span className="text-sm text-gray-600">{msg}</span>}
      </div>
    </div>
  );
}
