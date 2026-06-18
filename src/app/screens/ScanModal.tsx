'use client';
import { useEffect, useRef, useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useI18n } from '../i18n/I18nContext';

interface Props {
  /** Called with the decoded text when a QR is read. */
  onResult: (text: string) => void;
  onClose: () => void;
}

interface ZoomCap { min: number; max: number; step: number; val: number; }

/** Full-screen camera QR scanner overlay (BarcodeDetector + zxing-wasm fallback). */
export function ScanModal({ onResult, onClose }: Props) {
  const { t } = useI18n();
  const [err, setErr] = useState(false);
  const [done, setDone] = useState(false);
  const [mirrored, setMirrored] = useState(false);
  const [zoom, setZoom] = useState<ZoomCap | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);

  const applyZoom = (v: number) => {
    const adv = { advanced: [{ zoom: v }] } as unknown as MediaTrackConstraints;
    trackRef.current?.applyConstraints(adv).catch(() => {});
  };

  // Once the camera track is live: (1) counter-flip mirrored front/PC cameras, and
  // (2) auto zoom-in a little when the camera supports zoom (helps far/small QRs).
  useEffect(() => {
    if (err) return;
    let raf = 0;
    let tries = 0;
    const check = () => {
      const video = boxRef.current?.querySelector('video') as HTMLVideoElement | null;
      const track = (video?.srcObject as MediaStream | null)?.getVideoTracks?.()[0] ?? null;
      if (track) {
        trackRef.current = track;
        setMirrored(track.getSettings().facingMode !== 'environment');

        const caps = (track.getCapabilities?.() ?? {}) as { zoom?: { min: number; max: number; step?: number } };
        if (caps.zoom && caps.zoom.max > caps.zoom.min) {
          const { min, max } = caps.zoom;
          const step = caps.zoom.step ?? 0.1;
          const target = Math.min(max, min * 2); // gentle ~2x auto zoom
          applyZoom(target);
          setZoom({ min, max, step, val: target });
        }
        return;
      }
      if (tries++ < 90) raf = requestAnimationFrame(check);
    };
    raf = requestAnimationFrame(check);
    return () => cancelAnimationFrame(raf);
  }, [err]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4 bg-[rgba(2,6,10,.72)]"
      style={{ animation: 'reveal .2s both' }}
      onClick={onClose}
    >
      <div className="col items-center gap-4 w-full max-w-[360px]" onClick={(e) => e.stopPropagation()}>
        <div className="kicker">{t('connect.scanBtn')}</div>

        <div ref={boxRef} className="relative w-full aspect-square overflow-hidden rounded-box border border-line bg-scope">
          {!err ? (
            // Only this wrapper flips, so the brackets/controls stay put.
            <div className="absolute inset-0" style={{ transform: mirrored ? 'scaleX(-1)' : 'none' }}>
              <Scanner
                onScan={(codes) => {
                  if (done) return;
                  const v = codes[0]?.rawValue;
                  if (v) { setDone(true); onResult(v); }
                }}
                onError={() => setErr(true)}
                constraints={{ facingMode: 'environment' }}
                components={{ finder: false }}
                styles={{
                  container: { width: '100%', height: '100%' },
                  video: { width: '100%', height: '100%', objectFit: 'cover' },
                }}
              />
            </div>
          ) : (
            <div className="grid place-items-center w-full h-full p-6 text-center text-danger text-[13px]">
              {t('home.camError')}
            </div>
          )}

          {/* viewfinder brackets (not flipped) */}
          {!err && (['tl', 'tr', 'bl', 'br'] as const).map((p) => (
            <span
              key={p}
              className="absolute w-9 h-9 pointer-events-none z-10"
              style={{
                borderColor: 'var(--accent)', borderStyle: 'solid', borderWidth: 0,
                ...(p.includes('t') ? { top: 16, borderTopWidth: 3 } : { bottom: 16, borderBottomWidth: 3 }),
                ...(p.includes('l') ? { left: 16, borderLeftWidth: 3 } : { right: 16, borderRightWidth: 3 }),
              }}
            />
          ))}

          {/* zoom slider (only when the camera reports zoom support) */}
          {!err && zoom && (
            <input
              type="range"
              min={zoom.min}
              max={zoom.max}
              step={zoom.step}
              value={zoom.val}
              aria-label="zoom"
              onChange={(e) => {
                const v = Number(e.target.value);
                applyZoom(v);
                setZoom((z) => (z ? { ...z, val: v } : z));
              }}
              className="absolute left-1/2 -translate-x-1/2 bottom-3 w-3/4 z-20"
              style={{ accentColor: 'var(--accent)' }}
            />
          )}
        </div>

        <p className="muted text-[12.5px] text-center">{t('connect.scanning')}</p>
        <button className="btn ghost w-full" onClick={onClose}>{t('play.cancel')}</button>
      </div>
    </div>
  );
}
