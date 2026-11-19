"use client";

import { useEffect, useState } from "react";
import { makeQrDataUrl } from "@/lib/qrImage";

// The sign-up QR code shown directly on the page (for example the front page), so someone on a computer can scan it with their phone.
export default function QrCodeInline({ size = 176 }: { size?: number }) {
  const [img, setImg] = useState("");
  useEffect(() => {
    let cancelled = false;
    makeQrDataUrl(`${window.location.origin}/signup`, size * 3)
      .then((d) => { if (!cancelled) setImg(d); })
      .catch(() => { if (!cancelled) setImg(""); });
    return () => { cancelled = true; };
  }, [size]);
  if (!img) return <div style={{ width: size, height: size }} aria-hidden="true" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={img} alt="QR code to join Coach In Mind" width={size} height={size} />;
}
