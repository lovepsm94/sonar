import QRCode from 'qrcode';

/** Render a string to a PNG data URL for an <img src=…>. */
export async function makeQrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, { errorCorrectionLevel: 'L', margin: 1, width: 320 });
}

// Camera QR scanning is handled by the <ScanModal> component, which uses
// @yudiel/react-qr-scanner (BarcodeDetector + zxing-wasm fallback).
