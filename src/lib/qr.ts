// Leitura de QR Code: BarcodeDetector nativo (Chrome/Android) e jsQR como reserva.
import jsQR from "jsqr";

type Detector = { detect: (src: ImageBitmapSource) => Promise<{ rawValue: string }[]> };

function nativeDetector(): Detector | null {
  const BD = (globalThis as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
  if (!BD) return null;
  try {
    return new BD({ formats: ["qr_code"] });
  } catch {
    return null;
  }
}

function decodeCanvas(source: CanvasImageSource, w: number, h: number): string | null {
  const canvas = document.createElement("canvas");
  // jsQR é lento em imagens grandes: reduz para ~1000px
  const scale = Math.min(1, 1000 / Math.max(w, h));
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return jsQR(img.data, img.width, img.height, { inversionAttempts: "attemptBoth" })?.data ?? null;
}

export async function decodeQrFromBlob(blob: Blob): Promise<string | null> {
  const bmp = await createImageBitmap(blob);
  try {
    const det = nativeDetector();
    if (det) {
      const r = await det.detect(bmp).catch(() => []);
      if (r[0]?.rawValue) return r[0].rawValue;
    }
    return decodeCanvas(bmp, bmp.width, bmp.height);
  } finally {
    bmp.close();
  }
}

export async function decodeQrFromVideo(video: HTMLVideoElement): Promise<string | null> {
  if (!video.videoWidth) return null;
  const det = nativeDetector();
  if (det) {
    const r = await det.detect(video).catch(() => []);
    if (r[0]?.rawValue) return r[0].rawValue;
    return null;
  }
  return decodeCanvas(video, video.videoWidth, video.videoHeight);
}
