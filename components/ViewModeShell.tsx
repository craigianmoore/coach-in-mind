"use client";

import { useEffect, useState } from "react";

type Device = "phone" | "tablet" | "laptop";
type Size = "S" | "M" | "L" | "XL";
const TEXT_PX: Record<Size, number> = { S: 14, M: 16, L: 18, XL: 20 };

// Phone / Tablet / Laptop view switcher plus text-size options, shared by
// every Club2Coach and Coach2Mentor page (including admin). Device is
// auto-detected on first load; both choices are remembered per browser.
// Text size scales the whole page through the root font size (Tailwind
// sizes are rem-based) and is reset when leaving these pages.
export default function ViewModeShell({ children }: { children: React.ReactNode }) {
  const [device, setDevice] = useState<Device>("laptop");
  const [size, setSize] = useState<Size>("M");

  useEffect(() => {
    try {
      const m = localStorage.getItem("cim_view_device");
      const t = localStorage.getItem("cim_view_text");
      if (m === "phone" || m === "tablet" || m === "laptop") setDevice(m);
      else setDevice(window.innerWidth < 640 ? "phone" : window.innerWidth < 1024 ? "tablet" : "laptop");
      if (t === "S" || t === "M" || t === "L" || t === "XL") setSize(t);
    } catch {
      /* storage unavailable — defaults are fine */
    }
  }, []);

  useEffect(() => {
    document.documentElement.style.fontSize = `${TEXT_PX[size]}px`;
    return () => {
      document.documentElement.style.fontSize = "";
    };
  }, [size]);

  const pickDevice = (m: Device) => {
    setDevice(m);
    try {
      localStorage.setItem("cim_view_device", m);
    } catch {}
  };
  const pickSize = (t: Size) => {
    setSize(t);
    try {
      localStorage.setItem("cim_view_text", t);
    } catch {}
  };

  const seg = (active: boolean) =>
    `px-2.5 py-1 text-xs font-semibold ${active ? "bg-gray-800 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`;

  return (
    <div
      className={`view-mode-${device} mx-auto`}
      style={{ maxWidth: device === "phone" ? 430 : device === "tablet" ? 800 : undefined }}
    >
      <div className="flex flex-wrap items-center justify-end gap-3 pt-3">
        <div className="flex items-center gap-1 text-xs text-gray-500">
          View
          <div className="flex overflow-hidden rounded-lg border border-gray-300">
            {(["phone", "tablet", "laptop"] as const).map((m) => (
              <button key={m} type="button" onClick={() => pickDevice(m)} className={`${seg(device === m)} capitalize`}>
                {m}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          Text
          <div className="flex overflow-hidden rounded-lg border border-gray-300">
            {(["S", "M", "L", "XL"] as const).map((t) => (
              <button key={t} type="button" onClick={() => pickSize(t)} className={seg(size === t)}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
