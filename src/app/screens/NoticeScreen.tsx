'use client';
import { useI18n } from '../i18n/I18nContext';
import type { I18nKey } from '../i18n/i18n';
import { SCREEN, TITLE, MUTED, MONO, BTN_PRIMARY, BTN_GHOST } from './ui';

export type NoticeReason = 'handshake-failed' | 'timeout' | 'conn-lost';

const REASON_KEY: Record<NoticeReason, I18nKey> = {
  'handshake-failed': 'notice.handshakeFailed',
  'timeout': 'notice.timeout',
  'conn-lost': 'notice.connLost',
};

interface Props {
  reason: NoticeReason;
  onHome: () => void;
  /** When provided, a Retry button is shown (reloads). Omit for non-recoverable cases. */
  onRetry?: () => void;
}

export function NoticeScreen({ reason, onHome, onRetry }: Props) {
  const { t } = useI18n();
  return (
    <div className={SCREEN + ' justify-center items-center text-center gap-[22px]'}>
      <div className="flex flex-col items-center gap-[14px]">
        <svg
          className="w-[54px] h-[54px] text-enemy"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M12 3.5 1.8 21h20.4L12 3.5Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path d="M12 10v4.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="17.6" r="1.15" fill="currentColor" />
        </svg>
        <h2 className={TITLE + ' text-[26px]'}>{t('notice.title')}</h2>
        <p className={MUTED + ' text-[13.5px] leading-relaxed max-w-[34ch]'}>
          {t(REASON_KEY[reason])}
        </p>
      </div>

      <div className="flex flex-col gap-[11px] w-full">
        {onRetry && (
          <button className={BTN_PRIMARY + ' h-[50px]'} onClick={onRetry}>
            {t('notice.retry')}
          </button>
        )}
        <button className={(onRetry ? BTN_GHOST : BTN_PRIMARY) + ' h-[50px]'} onClick={onHome}>
          {t('notice.home')}
        </button>
      </div>
      <div className={MONO + ' ' + MUTED + ' text-[9.5px] tracking-[.14em] opacity-70'}>
        SONAR · P2P
      </div>
    </div>
  );
}
