'use client';
import { useEffect, useState } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { makeQrDataUrl } from '@/net/qr';
import { MiniRadar, WaitDots } from './bits';
import { ScanModal } from './ScanModal';
import {
  SCREEN, BTN_PRIMARY, BTN_GHOST, BTN_COPIED,
  KICKER, KICKER_ENEMY, MUTED, MONO,
  CHIP, CHIP_COPIED_FLASH, DOT,
  QR_FRAME, QR_CORNER_TL, QR_CORNER_TR, QR_CORNER_BL, QR_CORNER_BR,
  ROW,
} from './ui';

interface Props {
  myCode: string | null;
  needScan: boolean;
  onScanned: (text: string) => void;
  /** Pre-rendered QR data URL. When provided (guest flow), it's shown immediately
   *  instead of generating one here — avoids an empty-placeholder flash. */
  qr?: string | null;
}

export function ConnectScreen({ myCode, needScan, onScanned, qr = null }: Props) {
  const { t } = useI18n();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(qr);
  const [scanning, setScanning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [paste, setPaste] = useState('');

  useEffect(() => {
    if (qr) { setQrDataUrl(qr); return; }   // already rendered upstream
    if (myCode) makeQrDataUrl(myCode).then(setQrDataUrl);
  }, [myCode, qr]);

  const copyValue = () => {
    if (!myCode) return;
    const value = needScan ? `${location.origin}${location.pathname}#${myCode}` : myCode;
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }).catch(() => {});
  };

  const role = needScan ? 'host' : 'guest';

  return (
    <div className={SCREEN + ' justify-center gap-[22px] text-center !pt-[clamp(12px,3vh,30px)]'}>
      <div className="flex flex-col items-center justify-center gap-[6px]">
        <div className={role === 'guest' ? KICKER_ENEMY : KICKER}>
          {role === 'host' ? t('connect.host') : t('connect.guest')}
        </div>
        <div className={MUTED + ' text-[13px]'}>{t('connect.showQr')}</div>
      </div>

      <div className="flex flex-col items-center justify-center gap-5">
        {qrDataUrl ? (
          <div className={QR_FRAME}>
            <span className={QR_CORNER_TL} />
            <span className={QR_CORNER_TR} />
            <span className={QR_CORNER_BL} />
            <span className={QR_CORNER_BR} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="qr" width={188} height={188} className="block" />
          </div>
        ) : (
          <div className="w-[188px] h-[188px] bg-panel rounded-box border border-line grid place-items-center">
            <WaitDots />
          </div>
        )}

        {myCode && (
          <div className={CHIP + ' font-mono' + (copied ? CHIP_COPIED_FLASH : '')}>
            {needScan ? 'OFFER' : 'ANSWER'} · {myCode.slice(0, 4).toUpperCase()}
          </div>
        )}

        <button
          className={BTN_GHOST + ' w-full h-[44px]' + (copied ? BTN_COPIED : '')}
          onClick={copyValue}
        >
          {copied ? (
            <>
              <svg className="w-[16px] h-[16px]" width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t('connect.copied')}
            </>
          ) : (
            <>
              <svg className="w-[16px] h-[16px]" width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
                <path d="M5 15V5a2 2 0 0 1 2-2h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              {needScan ? t('connect.copy') : t('connect.copyToken')}
            </>
          )}
        </button>

        {needScan && (
          <>
            <button className={BTN_PRIMARY + ' w-full'} onClick={() => setScanning(true)}>
              <svg className="w-[17px] h-[17px]" width="17" height="17" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="2"/>
                <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="2"/>
              </svg>
              {t('connect.scanBtn')}
            </button>

            <div className={MONO + ' ' + MUTED + ' text-[10px] tracking-[.14em] mt-1'}>{t('connect.or')}</div>
            <div className={ROW + ' gap-2 w-full'}>
              <input
                value={paste}
                onChange={(e) => setPaste(e.target.value)}
                placeholder={t('connect.pastePlaceholder')}
                className="flex-1 min-h-0 h-[44px] px-3 rounded-sm2 bg-panel-2 border border-line text-ink font-mono text-[12px] outline-none"
              />
              <button
                className={BTN_PRIMARY + ' h-[44px] px-4'}
                disabled={!paste.trim()}
                onClick={() => onScanned(paste.trim())}
              >
                {t('connect.connectBtn')}
              </button>
            </div>
          </>
        )}

        {!needScan && (
          <div className="flex flex-col items-center justify-center gap-3">
            <MiniRadar size={150} />
            <div className={CHIP}>
              <span className={DOT} />
              {t('connect.linking')} <WaitDots />
            </div>
          </div>
        )}
      </div>

      {scanning && (
        <ScanModal
          onResult={(text) => { setScanning(false); onScanned(text); }}
          onClose={() => setScanning(false)}
        />
      )}
    </div>
  );
}
