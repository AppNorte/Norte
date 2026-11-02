"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ExternalLink, ImagePlus, Loader2, QrCode, Sparkles, Trash2, X } from "lucide-react";
import { compressImage } from "@/lib/files";
import { decodeQrFromVideo } from "@/lib/qr";

/** Botões de nota fiscal: ler QR ao vivo, tirar foto, escolher arquivo ou arrastar. */
export function ReceiptCapture({
  photoUrl,
  busy,
  status,
  aiAvailable,
  nfceUrl,
  onPhoto,
  onQr,
  onAi,
  onRemove,
}: {
  photoUrl: string | null;
  busy: boolean;
  status: string | null;
  aiAvailable: boolean;
  nfceUrl: string | null;
  onPhoto: (blob: Blob) => void;
  onQr: (text: string) => void;
  onAi: () => void;
  onRemove: () => void;
}) {
  const cam = useRef<HTMLInputElement>(null);
  const gal = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [view, setView] = useState(false);

  const take = async (f: File | undefined | null) => {
    if (!f || !f.type.startsWith("image/")) return;
    onPhoto(await compressImage(f));
  };

  return (
    <div
      className={`receipt ${drag ? "drag" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        void take(e.dataTransfer.files?.[0]);
      }}
    >
      <span className="receipt-title">Nota fiscal (opcional)</span>
      {photoUrl ? (
        <div className="receipt-preview">
          <button type="button" className="receipt-thumb" onClick={() => setView(true)} aria-label="Ver foto da nota">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl} alt="Foto da nota fiscal" />
          </button>
          <div className="receipt-info">
            <span className="receipt-status">
              {busy && <Loader2 size={16} className="spin" />} {status ?? "Foto anexada."}
            </span>
            <div className="btn-row" style={{ marginTop: 6 }}>
              {aiAvailable && !busy && (
                <button type="button" className="btn sm" onClick={onAi}>
                  <Sparkles size={15} /> Ler com IA
                </button>
              )}
              <button type="button" className="btn sm ghost" onClick={onRemove}>
                <Trash2 size={15} /> Remover foto
              </button>
            </div>
          </div>
        </div>
      ) : (
        status && (
          <p className="receipt-status" style={{ margin: "0 0 8px" }}>
            {busy && <Loader2 size={16} className="spin" />} {status}
          </p>
        )
      )}
      <div className="receipt-actions">
        <button type="button" className="receipt-btn" onClick={() => setScanning(true)}>
          <QrCode size={22} />
          <span>Ler QR Code</span>
        </button>
        <button type="button" className="receipt-btn" onClick={() => cam.current?.click()}>
          <Camera size={22} />
          <span>Tirar foto</span>
        </button>
        <button type="button" className="receipt-btn" onClick={() => gal.current?.click()}>
          <ImagePlus size={22} />
          <span>Galeria</span>
        </button>
      </div>
      <p className="receipt-hint">No computador, você também pode arrastar a foto para cá.</p>
      {nfceUrl && (
        <a className="inline-link" href={nfceUrl} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 14, marginTop: 6 }}>
          <ExternalLink size={14} /> Ver nota na Sefaz
        </a>
      )}
      <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={(e) => void take(e.target.files?.[0])} aria-label="Tirar foto da nota" />
      <input ref={gal} type="file" accept="image/*" hidden onChange={(e) => void take(e.target.files?.[0])} aria-label="Escolher foto da nota" />
      {scanning && (
        <QrScanner
          onClose={() => setScanning(false)}
          onResult={(t) => {
            setScanning(false);
            onQr(t);
          }}
          onFallbackPhoto={() => {
            setScanning(false);
            cam.current?.click();
          }}
        />
      )}
      {view && photoUrl && (
        <div className="photo-view" role="dialog" aria-label="Foto da nota" onClick={() => setView(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrl} alt="Foto da nota fiscal" />
          <button type="button" className="icon-btn photo-close" aria-label="Fechar">
            <X size={26} color="#fff" />
          </button>
        </div>
      )}
    </div>
  );
}

/** Câmera ao vivo procurando um QR Code. */
function QrScanner({ onClose, onResult, onFallbackPhoto }: { onClose: () => void; onResult: (t: string) => void; onFallbackPhoto: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const done = useRef(onResult);
  useEffect(() => {
    done.current = onResult;
  }, [onResult]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let alive = true;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (!alive || !video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        const tick = async () => {
          if (!alive || !video.current) return;
          const r = await decodeQrFromVideo(video.current).catch(() => null);
          if (r && alive) {
            if (navigator.vibrate) navigator.vibrate(60);
            done.current(r);
            return;
          }
          timer = setTimeout(tick, 220);
        };
        void tick();
      } catch {
        setErr("Não consegui abrir a câmera. Permita o acesso à câmera ou use “Tirar foto”.");
      }
    })();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="scanner" role="dialog" aria-label="Ler QR Code da nota">
      <video ref={video} playsInline muted />
      <div className="scanner-frame" aria-hidden="true" />
      <p className="scanner-text">{err ?? "Aponte para o QR Code da nota"}</p>
      <div className="scanner-actions">
        <button type="button" className="btn" onClick={onFallbackPhoto}>
          <Camera size={18} /> Tirar foto
        </button>
        <button type="button" className="btn ghost" style={{ color: "#fff" }} onClick={onClose}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
