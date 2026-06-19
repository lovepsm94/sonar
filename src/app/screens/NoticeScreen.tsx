'use client';
import { useMemo } from 'react';
import { useI18n } from '../i18n/I18nContext';
import type { I18nKey } from '../i18n/i18n';
import { SCREEN, TITLE, MUTED, MONO, KICKER_ENEMY, BTN_PRIMARY, BTN_GHOST, COL, SWEEP_CLS } from './ui';

export type NoticeReason = 'handshake-failed' | 'timeout' | 'conn-lost';

const REASON_KEY: Record<NoticeReason, I18nKey> = {
  'handshake-failed': 'notice.handshakeFailed',
  'timeout': 'notice.timeout',
  'conn-lost': 'notice.connLost',
};

// Short mono status line shown above the title, themed like every other screen's
// KICKER. Gives each reason its own voice while the body text carries the detail.
const REASON_KICKER: Record<NoticeReason, I18nKey> = {
  'handshake-failed': 'notice.statusHandshake',
  'timeout': 'notice.statusTimeout',
  'conn-lost': 'notice.statusConnLost',
};

const SCOPE = 116; // diameter of the dead sonar scope, px

// Ambient "going dark" layer behind the scope: a soft enemy-tinted glow, the
// last ping echoing out as dissipating rings, and a few specks sinking into the
// deep. Mirrors EndScreen's EndFX vocabulary (reuses end-glow-in / end-ring /
// debris-sink) so the notice feels part of the same world.
function LostFX() {
  const motes = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => ({
        left: (i * 11 + (i % 3) * 9) % 100,
        size: 3 + (i % 3) * 2,
        delay: (i % 6) * 0.5,
        dur: 4.2 + (i % 4) * 0.9,
      })),
    [],
  );

  return (
    <div
      aria-hidden="true"
      style={{ position: 'absolute', inset: '-40px -18px', zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}
    >
      {/* Cold radial glow behind the scope */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '34%',
          width: 320,
          height: 320,
          transform: 'translate(-50%,-50%)',
          borderRadius: '50%',
          opacity: 0,
          background:
            'radial-gradient(circle, color-mix(in srgb, var(--enemy) 18%, transparent), transparent 62%)',
          animation: 'end-glow-in 1.4s ease-out forwards',
        }}
      />

      {/* Specks of debris sinking into the dark */}
      {motes.map((m, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            top: -16,
            left: `${m.left}%`,
            width: m.size,
            height: m.size,
            borderRadius: '50%',
            opacity: 0,
            background:
              'radial-gradient(circle at 35% 30%, #fff2, color-mix(in srgb, var(--muted) 55%, transparent))',
            animation: `debris-sink ${m.dur}s ease-in ${m.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

// The sonar scope, gone quiet: grid rings, a faint idling sweep that finds
// nothing, and a lone contact blip that pulses once more before the signal dies.
// The last ping keeps echoing outward (end-ring) into the silence.
function DeadScope() {
  return (
    <div
      style={{ position: 'relative', width: SCOPE, height: SCOPE, animation: 'icon-sink 1.1s cubic-bezier(.4,.1,.3,1) both' }}
    >
      {/* Last ping echoing out behind the scope */}
      {([0, 0.9, 1.8] as const).map((delay, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: SCOPE,
            height: SCOPE,
            margin: `${-SCOPE / 2}px 0 0 ${-SCOPE / 2}px`,
            border: '1.5px solid color-mix(in srgb, var(--enemy) 60%, transparent)',
            borderRadius: '50%',
            opacity: 0,
            animation: `end-ring 3s ease-out ${delay}s infinite`,
          }}
        />
      ))}

      <div
        className="scope-skin relative rounded-full border border-line overflow-hidden"
        style={{
          width: SCOPE,
          height: SCOPE,
          background: 'radial-gradient(circle at 50% 50%, var(--scope-2), var(--scope))',
          boxShadow: '0 14px 40px -18px #000, inset 0 0 36px rgba(0,0,0,.5)',
          filter: 'drop-shadow(0 0 14px color-mix(in srgb, var(--enemy) 40%, transparent))',
        }}
      >
        {/* Faint sweep — still turning, but nothing answers */}
        <div className={SWEEP_CLS.replace('opacity-50', 'opacity-[.18]') + ' animate-sweep-rot'} />

        <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ position: 'relative', zIndex: 5 }}>
          {/* Range rings + crosshair */}
          <g stroke="var(--grid)" strokeWidth="0.6" fill="none">
            <circle cx="50" cy="50" r="46" />
            <circle cx="50" cy="50" r="30" />
            <circle cx="50" cy="50" r="15" />
          </g>
          <g stroke="var(--line)" strokeWidth="0.6">
            <line x1="4" y1="50" x2="96" y2="50" />
            <line x1="50" y1="4" x2="50" y2="96" />
          </g>

          {/* The lost contact — blips weakly, then fades */}
          <circle cx="66" cy="38" r="2.6" fill="var(--enemy)">
            <animate attributeName="opacity" values="0;.9;0;0" dur="2.6s" repeatCount="indefinite" />
            <animate attributeName="r" values="2.2;3.4;2.2;2.2" dur="2.6s" repeatCount="indefinite" />
          </circle>

          {/* Signal-break interference streak across the scope */}
          <path
            d="M30 64 L45 56 L52 62 L70 50"
            fill="none"
            stroke="var(--danger)"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.55"
          />
        </svg>
      </div>
    </div>
  );
}

interface Props {
  reason: NoticeReason;
  onHome: () => void;
  /** When provided, a Retry button is shown (reloads). Omit for non-recoverable cases. */
  onRetry?: () => void;
}

export function NoticeScreen({ reason, onHome, onRetry }: Props) {
  const { t } = useI18n();
  return (
    <div className={SCREEN + ' justify-center items-center text-center gap-[26px]'} style={{ position: 'relative' }}>
      <LostFX />

      <div className={COL + ' items-center gap-[16px]'} style={{ position: 'relative', zIndex: 2 }}>
        <DeadScope />
        <div className={KICKER_ENEMY}>{t(REASON_KICKER[reason])}</div>
        <h2 className={TITLE + ' text-[27px]'}>{t('notice.title')}</h2>
        <p className={MUTED + ' text-[13.5px] leading-relaxed max-w-[34ch]'}>{t(REASON_KEY[reason])}</p>
      </div>

      <div className="flex flex-col gap-[11px] w-full" style={{ position: 'relative', zIndex: 2 }}>
        {onRetry && (
          <button className={BTN_PRIMARY + ' h-[50px]'} onClick={onRetry}>
            {t('notice.retry')}
          </button>
        )}
        <button className={(onRetry ? BTN_GHOST : BTN_PRIMARY) + ' h-[50px]'} onClick={onHome}>
          {t('notice.home')}
        </button>
      </div>

      <div
        className={MONO + ' ' + MUTED + ' text-[9.5px] tracking-[.14em] opacity-70'}
        style={{ position: 'relative', zIndex: 2 }}
      >
        SONAR · P2P
      </div>
    </div>
  );
}
