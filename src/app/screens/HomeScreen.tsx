'use client';
import { useState } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { MiniRadar } from './bits';
import { ScanModal } from './ScanModal';
import { SCREEN, BTN_PRIMARY, BTN_GHOST, KICKER, TITLE, MONO, MUTED } from './ui';

interface Props {
  onCreate: () => void;
  onJoinCode: (text: string) => void;
  /** Inline error from a rejected join scan (bad or wrong-role code). */
  error?: string | null;
  /** Clear the inline error (called when the user rescans). */
  onClearError?: () => void;
}

export function HomeScreen({ onCreate, onJoinCode, error = null, onClearError }: Props) {
  const { t } = useI18n();
  const [scanning, setScanning] = useState(false);

  return (
    <div className={SCREEN + ' items-center justify-between text-center'}>
      <div className="flex flex-col items-center justify-center gap-[22px] mt-[14px]">
        <MiniRadar size={146} />
        <div>
          <div className={KICKER}>{t('home.eyebrow')}</div>
          <h1 className={TITLE + ' text-[58px] md:text-[72px] mt-[10px] mb-0'}>SONAR</h1>
          <div className={MONO + ' ' + MUTED + ' text-[11px] tracking-[.34em] mt-1'}>
            {t('home.sub')}
          </div>
        </div>
      </div>

      <p className={MUTED + ' text-[13.5px] leading-relaxed w-full'}>
        {t('home.blurb')}
      </p>

      <div className="flex flex-col gap-[11px] w-full">
        <button className={BTN_PRIMARY + ' h-[54px] text-[13px]'} onClick={onCreate}>
          <svg className="w-[18px] h-[18px]" width="18" height="18" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="2"/>
            <rect x="13" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="2"/>
            <rect x="3" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="2"/>
            <path d="M13 17h8M17 13v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          {t('home.create')}
        </button>
        <button className={BTN_GHOST + ' h-[50px]'} onClick={() => { onClearError?.(); setScanning(true); }}>
          <svg className="w-[17px] h-[17px]" width="17" height="17" viewBox="0 0 24 24" fill="none">
            <path d="M3 7V4h3M21 7V4h-3M3 17v3h3M21 17v3h-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M7 12h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          {t('home.join')}
        </button>
        {error ? (
          <p className={MONO + ' text-danger text-[11px] tracking-[.04em] leading-snug mt-0.5'}>
            ⚠ {error}
          </p>
        ) : (
          <p className={MONO + ' ' + MUTED + ' text-[9.5px] tracking-[.1em] opacity-70 mt-0.5'}>
            {t('home.joinHint')}
          </p>
        )}
      </div>

      {scanning && (
        <ScanModal
          onResult={(text) => { setScanning(false); onJoinCode(text); }}
          onClose={() => setScanning(false)}
        />
      )}
    </div>
  );
}
