"use client";

import QRCode from "qrcode";

/** Generate a QR code as a PNG data URL (for on-screen <img> use). */
export async function qrDataUrl(text: string, size = 160): Promise<string> {
  return QRCode.toDataURL(text, { width: size, margin: 1 });
}

/** Generate a QR code as an inline SVG string (for print HTML). */
export async function qrSvg(text: string, size = 120): Promise<string> {
  return QRCode.toString(text, { type: "svg", width: size, margin: 0 });
}
