'use client';
import { useMemo } from 'react';
import { useI18n } from '../i18n/I18nContext';
import type { GameState } from '@/game/types';
import { SCREEN, BTN_PRIMARY, BTN_GHOST, KICKER, KICKER_ENEMY, TITLE, MUTED, MONO, HUD_CARD, COL, ROW } from './ui';

interface Stats { turns: number; hits: number; sonars: number; }

interface Props {
  state: GameState;
  stats: Stats;
  onRematch: () => void;
  onHome: () => void;
}

// Deterministic-ish particle set (matches design/screens.jsx EndFX)
interface Bubble { left: number; size: number; delay: number; dur: number; }

function EndFX({ won }: { won: boolean }) {
  const bubbles = useMemo<Bubble[]>(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        left:  (i * 6.3 + (i % 3) * 7) % 100,
        size:  4 + (i % 4) * 4,
        delay: (i % 8) * 0.28,
        dur:   3.2 + (i % 5) * 0.7,
      })),
    [],
  );

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: '-40px -18px',
        zIndex: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {/* Radial glow behind icon */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '36%',
          width: 360,
          height: 360,
          transform: 'translate(-50%,-50%)',
          borderRadius: '50%',
          opacity: 0,
          background: won
            ? 'radial-gradient(circle, color-mix(in srgb, var(--accent) 32%, transparent), transparent 62%)'
            : 'radial-gradient(circle, color-mix(in srgb, var(--danger) 26%, transparent), transparent 60%)',
          animation: won
            ? 'end-glow-in 1s ease-out forwards, end-glow-breathe 3.4s ease-in-out 1s infinite'
            : 'end-glow-in 1.4s ease-out forwards',
        }}
      />

      {/* Bubble / debris particles */}
      {bubbles.map((b, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            ...(won
              ? { bottom: -16 }
              : { top: -16 }),
            left: `${b.left}%`,
            width: b.size,
            height: b.size,
            borderRadius: '50%',
            opacity: 0,
            background: won
              ? 'radial-gradient(circle at 35% 30%, #fff6, color-mix(in srgb, var(--accent) 60%, transparent))'
              : 'radial-gradient(circle at 35% 30%, #fff3, color-mix(in srgb, var(--danger) 45%, transparent))',
            boxShadow: won
              ? `0 0 8px color-mix(in srgb, var(--accent) 50%, transparent)`
              : undefined,
            animationName: won ? 'bubble-rise' : 'debris-sink',
            animationTimingFunction: won ? 'linear' : 'ease-in',
            animationIterationCount: 'infinite',
            animationDelay: `${b.delay}s`,
            animationDuration: `${b.dur}s`,
          }}
        />
      ))}

      {/* Expanding sonar rings (win only) */}
      {won && ([0, 0.8, 1.6] as const).map((delay, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 92,
            height: 92,
            margin: '-46px 0 0 -46px',
            border: '1.5px solid var(--accent)',
            borderRadius: '50%',
            opacity: 0,
            animation: `end-ring 2.4s ease-out ${delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

export function EndScreen({ state, stats, onRematch, onHome }: Props) {
  const { t } = useI18n();
  const won = state.winner === state.side;

  return (
    <div
      className={SCREEN + ' items-center justify-center text-center gap-[26px]'}
      style={{ position: 'relative' }}
    >
      {/* Ambient FX layer (behind everything) */}
      <EndFX won={won} />

      <div className={COL + ' items-center justify-center gap-[14px]'} style={{ position: 'relative', zIndex: 2 }}>
        <div style={{ position: 'relative' }}>
          {/* Win: 3 staggered expanding rings around the icon */}
          {won && ([0, 0.8, 1.6] as const).map((delay, i) => (
            <span
              key={i}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: 92,
                height: 92,
                margin: '-46px 0 0 -46px',
                border: '1.5px solid var(--accent)',
                borderRadius: '50%',
                opacity: 0,
                animation: `end-ring 2.4s ease-out ${delay}s infinite`,
              }}
            />
          ))}

          {/* Icon with entrance animation */}
          <svg
            width="92"
            height="92"
            viewBox="0 0 24 24"
            fill="none"
            style={{
              position: 'relative',
              zIndex: 2,
              opacity: 1,
              filter: `drop-shadow(0 0 20px ${won ? 'var(--accent)' : 'var(--danger)'})`,
              animation: won
                ? 'icon-pop .7s cubic-bezier(.2,1.4,.4,1) both'
                : 'icon-sink 1.1s cubic-bezier(.4,.1,.3,1) both',
            }}
          >
            {won
              ? <path d="M6 4h12v3a6 6 0 0 1-12 0V4ZM4 5h2M18 5h2M9 16h6M8 20h8M12 16v4" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              : <path d="M12 3 3 8v6c0 5 4 7 9 7s9-2 9-7V8l-9-5Z M9 10l6 6M15 10l-6 6" stroke="var(--danger)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            }
          </svg>
        </div>

        <div
          className={won ? KICKER : KICKER_ENEMY}
          style={{ color: won ? 'var(--accent)' : 'var(--danger)' }}
        >
          {won ? t('end.victory') : t('end.defeat')}
        </div>
        <h1 className={TITLE + ' text-[40px] leading-[1.05]'}>
          {won ? t('end.win') : t('end.lose')}
        </h1>
        <p className={MUTED + ' text-[13.5px] max-w-[270px] leading-relaxed'}>
          {won ? t('end.winSub') : t('end.loseSub')}
        </p>
      </div>

      <div className={ROW + ' gap-[10px] w-full'} style={{ position: 'relative', zIndex: 2 }}>
        <div className={HUD_CARD + ' flex-1 min-h-0 ' + COL + ' items-center justify-center gap-[3px]'}>
          <div className={MONO + ' text-[22px] text-accent'}>{stats.turns}</div>
          <div className={MONO + ' ' + MUTED + ' text-[9px] tracking-[.16em]'}>{t('end.turns')}</div>
        </div>
        <div className={HUD_CARD + ' flex-1 min-h-0 ' + COL + ' items-center justify-center gap-[3px]'}>
          <div className={MONO + ' text-[22px] text-danger'}>{stats.hits}</div>
          <div className={MONO + ' ' + MUTED + ' text-[9px] tracking-[.16em]'}>{t('end.hits')}</div>
        </div>
        <div className={HUD_CARD + ' flex-1 min-h-0 ' + COL + ' items-center justify-center gap-[3px]'}>
          <div className={MONO + ' text-[22px] text-enemy'}>{stats.sonars}</div>
          <div className={MONO + ' ' + MUTED + ' text-[9px] tracking-[.16em]'}>{t('end.scans')}</div>
        </div>
      </div>

      <div className={COL + ' gap-[10px] w-full'} style={{ position: 'relative', zIndex: 2 }}>
        <button className={BTN_PRIMARY + ' h-[52px]'} onClick={onRematch}>
          {t('end.rematch')}
        </button>
        <button className={BTN_GHOST + ' h-[46px]'} onClick={onHome}>
          {t('end.home')}
        </button>
      </div>
    </div>
  );
}
