import QRCode from "qrcode";

// Builds the Coach In Mind sign-up QR code as an image: high error correction so the logo can cover the centre
// and the code still scans. If the logo can't load, the plain code is returned.
export async function makeQrDataUrl(url: string, width = 640): Promise<string> {
  const canvas = document.createElement("canvas");
  await QRCode.toCanvas(canvas, url, { width, margin: 2, errorCorrectionLevel: "H" });
  const plain = canvas.toDataURL("image/png");
  try {
    const logo = new Image();
    logo.src = "/coach-in-mind-logo.png";
    await logo.decode();
    const ctx = canvas.getContext("2d")!;
    const box = canvas.width * 0.24;
    const x = (canvas.width - box) / 2;
    const pad = Math.max(2, canvas.width * 0.0125);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x - pad, x - pad, box + pad * 2, box + pad * 2);
    const scale = Math.min(box / logo.naturalWidth, box / logo.naturalHeight);
    const w = logo.naturalWidth * scale, h = logo.naturalHeight * scale;
    ctx.drawImage(logo, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
    return canvas.toDataURL("image/png");
  } catch {
    return plain;
  }
}
