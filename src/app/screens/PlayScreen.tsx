'use client';
import { useState, type ReactNode } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { Board, type Fx } from '../board/Board';
import { WaitDots } from './bits';
import type { Cell, Direction, GameState, SectorId } from '@/game/types';
import type { RadioView } from '../useRadioOperator';
import { COST, GRID, MAX_ENERGY, START_HP, TORPEDO_RANGE } from '@/game/types';
import { manhattan, step, sameCell, inBounds } from '@/game/geo';
import {
  SCREEN, BTN_GHOST, BTN_DANGER,
  KICKER, KICKER_ENEMY, MUTED, MONO, HUD_CARD, CHIP,
  DPAD, PAD,
  ACTION, ACTION_ARMED, ACTION_LBL, ACTION_COST, ICO,
  PIP, PIP_ON, PIP_ENEMY_ON, PIP_LOST,
  EBAR, EBAR_FILL, EBAR_FILL_FULL,
  TURN_BANNER_MINE, TURN_BANNER_THEIRS,
  LOG, LOG_ROW, LOG_T, LOG_ME, LOG_EN, LOG_HIT,
  SHAKE,
  SHEET_WRAP, SHEET,
  SEG, SEG_BTN, SEG_BTN_ON,
  ROW, COL, GROW, BETWEEN,
} from './ui';

interface LogEntry { id: number; who: 'me' | 'en' | 'hit'; vi: string; en: string; }

interface Props {
  state: GameState;
  myTurn: boolean;
  /** True while we've deployed but the opponent hasn't — board is live but all actions are locked. */
  waiting?: boolean;
  shake: boolean;
  effects: Fx[];
  onEffectDone: (id: number) => void;
  revealSectors: SectorId[];
  log: LogEntry[];
  // Radio Operator (enemy plot)
  ro: RadioView | null;
  roOn: boolean;
  roCount: number | null;
  onToggleRO: () => void;
  onPinCell: (c: Cell) => void;
  onReveal: (axis: 'row' | 'col') => void;
  onMove: (dir: Direction) => void;
  onSonar: () => void;
  onSilence: (dir: Direction, dist: number) => void;
  onTorpedo: (c: Cell) => void;
  onSurface: () => void;
  onResign: () => void;
}

const colCh = (x: number) => String.fromCharCode(65 + x);

const ICONS: Record<'sonar' | 'silence' | 'torpedo' | 'surface', ReactNode> = {
  sonar: <svg className={ICO} viewBox="0 0 24 24" fill="none"><path d="M12 12v.01M8.5 12a3.5 3.5 0 0 1 7 0M5 12a7 7 0 0 1 14 0M2 12a10 10 0 0 1 20 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  silence: <svg className={ICO} viewBox="0 0 24 24" fill="none"><path d="M11 5 6 9H3v6h3l5 4V5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  torpedo: <svg className={ICO} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg>,
  surface: <svg className={ICO} viewBox="0 0 24 24" fill="none"><path d="M12 19V7M12 7l-4 4M12 7l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 20c2 0 2-1.5 4.5-1.5S10 20 12 20s2-1.5 4.5-1.5S19 20 21 20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
};
const DIR_PATH: Record<Direction, string> = {
  N: 'M12 19V6M6 12l6-6 6 6', S: 'M12 5v13M18 12l-6 6-6-6', E: 'M5 12h13M12 6l6 6-6 6', W: 'M19 12H6M12 18l-6-6 6-6',
};
const ARROW = (d: string) => (
  <svg className="w-[17px] h-[17px]" viewBox="0 0 24 24" fill="none">
    <path d={d} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function pip(i: number, kind: 'me' | 'enemy', hp: number) {
  if (i < hp) {
    return <span key={i} className={kind === 'enemy' ? PIP_ENEMY_ON : PIP_ON} />;
  }
  return <span key={i} className={PIP_LOST} />;
}

export function PlayScreen(props: Props) {
  const { state, myTurn, waiting = false, shake, effects, onEffectDone, revealSectors, log,
    ro, roOn, roCount, onToggleRO, onPinCell, onReveal,
    onMove, onSonar, onSilence, onTorpedo, onSurface, onResign } = props;
  const { t, lang } = useI18n();
  const [mode, setMode] = useState<'normal' | 'torpedo'>('normal');
  const [sheet, setSheet] = useState<null | 'silence' | 'resign' | 'history'>(null);
  const [sdir, setSdir] = useState<Direction>('N');
  const [sdist, setSdist] = useState(1);

  const me = state.me;
  const en = state.enemy;
  const canAct = myTurn && state.winner === null && !waiting;

  const range: Cell[] = [];
  if (mode === 'torpedo') {
    for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
      const c = { x, y };
      if (inBounds(c) && !state.map.islands[y][x] && manhattan(me.pos, c) <= TORPEDO_RANGE && !sameCell(c, me.pos)) {
        range.push(c);
      }
    }
  }

  const moveLegal = (d: Direction): boolean => {
    const tg = step(me.pos, d);
    return inBounds(tg) && !state.map.islands[tg.y][tg.x] && !me.trail.some((p) => sameCell(p, tg));
  };

  return (
    <div className={SCREEN + ' gap-[clamp(4px,1dvh,10px)] !pt-[clamp(8px,1.6dvh,14px)] !pb-[clamp(6px,1.4dvh,20px)] !px-[clamp(8px,3vw,18px)]'}>
      {/* header: turn + count */}
      <div className={ROW + ' ' + BETWEEN + ' items-center gap-[10px]'}>
        <div className={waiting || !myTurn ? TURN_BANNER_THEIRS : TURN_BANNER_MINE}>
          <span
            className="inline-block w-[6px] h-[6px] rounded-full animate-pulse"
            style={{
              background: waiting || !myTurn ? 'var(--enemy)' : 'var(--accent)',
              boxShadow: '0 0 8px ' + (waiting || !myTurn ? 'var(--enemy)' : 'var(--accent)'),
            }}
          />
          {waiting ? <>{t('place.waiting')}<WaitDots /></> : myTurn ? t('play.yourTurn') : t('play.enemyTurn')}
        </div>
        {!waiting && (
          <div className={MONO + ' ' + MUTED + ' text-[10px] tracking-[.14em] text-right'}>
            {t('play.turn')} {String(state.turnNumber).padStart(2, '0')}
          </div>
        )}
      </div>

      {/* enemy intel strip */}
      <div className={ROW + ' ' + BETWEEN + ' items-center ' + HUD_CARD + ' px-3 py-[clamp(5px,1dvh,9px)]'}>
        <div className={ROW + ' items-center gap-[9px]'}>
          <span className={KICKER_ENEMY + ' text-[9.5px]'}>{t('play.enemy')}</span>
          <div className="flex gap-[5px]">{Array.from({ length: START_HP }, (_, i) => pip(i, 'enemy', en.hp))}</div>
        </div>
        <div className={ROW + ' items-center gap-[7px]'}>
          {/* Radio Operator toggle — opens the enemy plot; badge shows the live candidate count. */}
          <button
            type="button"
            onClick={onToggleRO}
            title={t('ro.name')}
            className={'relative inline-flex items-center gap-[4px] rounded-full border px-[9px] py-[5px] cursor-pointer select-none transition-[transform,color,border-color,background] duration-150 active:scale-[.93] [-webkit-tap-highlight-color:transparent] '
              + (roOn
                ? 'text-enemy border-enemy [background:color-mix(in_srgb,var(--enemy)_14%,transparent)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--enemy)_30%,transparent),0_0_14px_-4px_var(--enemy)]'
                : 'text-muted border-line bg-panel-2')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M5 11h14a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.7" />
              <path d="M8 11 17 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              <circle cx="17" cy="5" r="1.6" fill="currentColor" />
              <circle cx="8" cy="15" r="1.7" fill="currentColor" />
              <path d="M13 14h4M13 17h2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
            {roCount != null && (
              <span className={'min-w-[15px] h-[15px] px-[3px] rounded-full font-mono text-[9px] font-bold inline-flex items-center justify-center '
                + (roOn ? 'bg-enemy text-[#04130c]' : 'bg-muted text-panel')}>{roCount}</span>
            )}
          </button>
        </div>
      </div>

      {/* board — fills the full container width, but caps at the leftover height so it never
          overlaps the HUD: it shrinks to a smaller centered square when space is tight. */}
      <div className={GROW + ' flex flex-col min-h-0 gap-[5px] ' + (shake ? SHAKE : '')}>
        {/* board caption: which sheet you're reading + live plot count / clear */}
        <div className={ROW + ' ' + BETWEEN + ' items-center h-[14px]'}>
          <span className={MONO + ' text-[9px] tracking-[.18em] uppercase'} style={{ color: roOn ? 'var(--enemy)' : 'var(--muted)' }}>
            {roOn ? '◎ ' + t('ro.toggle') : '◈ ' + t('ro.myBoard')}
          </span>
          {roOn && ro && ro.started && (
            <div className={ROW + ' items-center gap-[8px]'}>
              <span className={MONO + ' text-[9px] text-enemy tracking-[.04em]'}>{ro.count} {t('ro.possible')}</span>
            </div>
          )}
        </div>
        <div className="flex-1 min-h-0 flex items-center justify-center">
          <div className="w-full aspect-square max-h-full">
            <Board
              state={state}
              mode={roOn ? 'plot' : (mode === 'torpedo' ? 'torpedo' : 'idle')}
              highlight={!roOn && mode === 'torpedo' ? range : []}
              plot={roOn ? ro : null}
              onPlotCell={onPinCell}
              effects={effects}
              onEffectDone={onEffectDone}
              revealSectors={revealSectors}
              onCellClick={(c) => { if (!roOn && mode === 'torpedo' && canAct) { onTorpedo(c); setMode('normal'); } }}
            />
          </div>
        </div>
      </div>

      {/* my status — ~10% more compact than before to give the board more height */}
      <div className={ROW + ' ' + BETWEEN + ' items-center ' + HUD_CARD + ' px-3 py-[clamp(5px,1dvh,9px)] gap-[12px]'}>
        <div className={COL + ' gap-[5px]'}>
          <span className={KICKER + ' text-[9.5px]'}>{t('play.hull')}</span>
          <div className="flex gap-[5px]">{Array.from({ length: START_HP }, (_, i) => pip(i, 'me', me.hp))}</div>
        </div>
        <div className={COL + ' ' + GROW + ' gap-[5px]'}>
          <div className={ROW + ' ' + BETWEEN + ' items-baseline'}>
            <span className={KICKER + ' text-[9.5px]'}>{t('play.energy')}</span>
            <span
              className={MONO + ' text-[11px]'}
              style={{ color: me.energy >= MAX_ENERGY ? 'var(--gold)' : 'var(--ink)' }}
            >
              {me.energy}/{MAX_ENERGY}
            </span>
          </div>
          <div className={EBAR}>
            <i className={me.energy >= MAX_ENERGY ? EBAR_FILL_FULL : EBAR_FILL}
               style={{ width: (100 * me.energy / MAX_ENERGY) + '%' }} />
          </div>
        </div>
      </div>

      {/* controls */}
      <div className={ROW + ' gap-3 items-stretch'}>
        <div className={DPAD + ' !w-[clamp(80px,28vw,104px)]'}>
          <span />
          <button className={PAD} disabled={!canAct || mode === 'torpedo' || !moveLegal('N')} onClick={() => onMove('N')}>{ARROW(DIR_PATH.N)}</button>
          <span />
          <button className={PAD} disabled={!canAct || mode === 'torpedo' || !moveLegal('W')} onClick={() => onMove('W')}>{ARROW(DIR_PATH.W)}</button>
          <span className="aspect-square border border-dashed border-line rounded-sm2 bg-transparent grid place-items-center opacity-50 pointer-events-none">
            <svg width="13" height="13" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" fill="var(--accent)" /></svg>
          </span>
          <button className={PAD} disabled={!canAct || mode === 'torpedo' || !moveLegal('E')} onClick={() => onMove('E')}>{ARROW(DIR_PATH.E)}</button>
          <span />
          <button className={PAD} disabled={!canAct || mode === 'torpedo' || !moveLegal('S')} onClick={() => onMove('S')}>{ARROW(DIR_PATH.S)}</button>
          <span />
        </div>

        <div className={GROW + ' grid grid-cols-2 gap-[7px]'}>
          <button className={ACTION} disabled={!canAct || me.energy < COST.sonar} onClick={onSonar}>
            <span className={ACTION_COST}>{COST.sonar}</span>
            {ICONS.sonar}
            <span className={ACTION_LBL}>{t('play.sonar')}</span>
          </button>
          <button className={ACTION} disabled={!canAct || me.energy < COST.silence} onClick={() => setSheet('silence')}>
            <span className={ACTION_COST}>{COST.silence}</span>
            {ICONS.silence}
            <span className={ACTION_LBL}>{t('play.silence')}</span>
          </button>
          <button
            className={ACTION + (mode === 'torpedo' ? ACTION_ARMED : '')}
            disabled={!canAct || me.energy < COST.torpedo}
            onClick={() => setMode(mode === 'torpedo' ? 'normal' : 'torpedo')}
          >
            <span className={ACTION_COST}>{COST.torpedo}</span>
            {ICONS.torpedo}
            <span className={ACTION_LBL}>{mode === 'torpedo' ? t('play.cancel') : t('play.torpedo')}</span>
          </button>
          <button className={ACTION} disabled={!canAct} onClick={onSurface}>
            {ICONS.surface}
            <span className={ACTION_LBL}>{t('play.surface')}</span>
          </button>
        </div>
      </div>

      {/* log + resign */}
      <div className={ROW + ' ' + BETWEEN + ' items-center gap-[10px]'}>
        <button
          type="button"
          className={LOG + ' ' + GROW + ' relative h-[clamp(34px,5dvh,46px)] overflow-hidden flex flex-col-reverse text-left cursor-pointer [-webkit-tap-highlight-color:transparent]'}
          onClick={() => setSheet('history')}
          aria-label={t('play.history')}
        >
          {log.slice(-3).reverse().map((l) => (
            <div className={LOG_ROW} key={l.id}>
              <span className={LOG_T}>›</span>
              <span className={`${l.who === 'me' ? LOG_ME : l.who === 'en' ? LOG_EN : LOG_HIT} flex-1`}>
                {lang === 'vi' ? l.vi : l.en}
              </span>
            </div>
          ))}
          {log.length > 3 && (
            <span className={LOG_T + ' absolute top-[2px] right-0 not-italic'} aria-hidden>⋯</span>
          )}
        </button>
        {/* btn ghost danger: transparent bg + danger color + danger border, overrides base size to 10px */}
        <button
          className="font-mono tracking-[.14em] uppercase font-semibold rounded-sm2 cursor-pointer border bg-transparent text-danger border-[color-mix(in_srgb,var(--danger)_40%,transparent)] py-2 px-3 text-[10px] transition-[transform,background,border-color,box-shadow] duration-[120ms,200ms,200ms,200ms] inline-flex items-center justify-center gap-[9px] select-none active:scale-[.96] [-webkit-tap-highlight-color:transparent]"
          onClick={() => setSheet('resign')}
        >
          {t('play.resign')}
        </button>
      </div>

      {mode === 'torpedo' && (
        <div className={CHIP + ' absolute left-1/2 -translate-x-1/2 bottom-[150px] border-danger text-danger bg-panel z-20'}>
          {t('play.torpedoHint')}
        </div>
      )}

      {/* forced reveal sheet — enemy sonar'd you; pick the true line that gives away the least */}
      {state.pendingSonar !== null && (
        <div className={SHEET_WRAP}>
          <div className={SHEET} onClick={(e) => e.stopPropagation()}>
            <div className={KICKER_ENEMY}>{t('reveal.title')}</div>
            <p className={MUTED + ' text-[13px] mt-2 mb-[16px] leading-[1.5]'}>{t('reveal.prompt')}</p>
            <div className={ROW + ' gap-[10px]'}>
              <button
                className="flex-1 h-[64px] flex flex-col items-center justify-center gap-[4px] rounded-sm2 border border-enemy bg-panel-2 text-ink cursor-pointer active:scale-[.96] [-webkit-tap-highlight-color:transparent]"
                onClick={() => onReveal('row')}
              >
                <span className="text-[11px] tracking-[.1em] uppercase">{t('reveal.row')}</span>
                <span className={MONO + ' text-[20px] text-enemy'}>{me.pos.y + 1}</span>
              </button>
              <button
                className="flex-1 h-[64px] flex flex-col items-center justify-center gap-[4px] rounded-sm2 border border-enemy bg-panel-2 text-ink cursor-pointer active:scale-[.96] [-webkit-tap-highlight-color:transparent]"
                onClick={() => onReveal('col')}
              >
                <span className="text-[11px] tracking-[.1em] uppercase">{t('reveal.col')}</span>
                <span className={MONO + ' text-[20px] text-enemy'}>{colCh(me.pos.x)}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* silence sheet */}
      {sheet === 'silence' && (
        <div className={SHEET_WRAP} onClick={() => setSheet(null)}>
          <div className={SHEET} onClick={(e) => e.stopPropagation()}>
            <div className={KICKER}>{t('play.silence')}</div>
            <p className={MUTED + ' text-[12.5px] mt-[6px] mb-[14px]'}>{t('silence.hint')}</p>
            <div className={MONO + ' ' + MUTED + ' text-[10px] tracking-[.14em] mb-[7px]'}>{t('silence.dir')}</div>
            <div className={SEG + ' mb-[14px]'}>
              {(['N', 'W', 'E', 'S'] as Direction[]).map((d) => (
                <button key={d} className={sdir === d ? SEG_BTN_ON : SEG_BTN} onClick={() => setSdir(d)}>{ARROW(DIR_PATH[d])}</button>
              ))}
            </div>
            <div className={MONO + ' ' + MUTED + ' text-[10px] tracking-[.14em] mb-[7px]'}>{t('silence.dist')}</div>
            <div className={SEG + ' mb-[18px]'}>
              {[1, 2, 3].map((n) => (
                <button key={n} className={sdist === n ? SEG_BTN_ON : SEG_BTN} onClick={() => setSdist(n)}>{n}</button>
              ))}
            </div>
            <button
              className="font-mono text-[12px] tracking-[.14em] uppercase font-semibold rounded-sm2 cursor-pointer border-transparent bg-[linear-gradient(180deg,var(--accent),var(--accent-deep))] text-[#04130c] px-[16px] py-[13px] transition-[transform,background,border-color,box-shadow] duration-[120ms,200ms,200ms,200ms] inline-flex items-center justify-center gap-[9px] select-none active:scale-[.97] shadow-[0_8px_22px_-8px_var(--accent),inset_0_1px_0_rgba(255,255,255,.35)] w-full h-[50px]"
              onClick={() => { onSilence(sdir, sdist); setSheet(null); }}
            >
              {t('silence.go')}
            </button>
          </div>
        </div>
      )}

      {/* resign sheet */}
      {sheet === 'resign' && (
        <div className={SHEET_WRAP} onClick={() => setSheet(null)}>
          <div className={SHEET} onClick={(e) => e.stopPropagation()}>
            <div className={KICKER_ENEMY + ' text-danger'}>{t('play.resign')}</div>
            <p className={MUTED + ' text-[13.5px] mt-2 mb-[18px] leading-[1.5]'}>{t('resign.confirm')}</p>
            <div className={ROW + ' gap-[10px]'}>
              <button
                className="font-mono text-[12px] tracking-[.14em] uppercase font-semibold rounded-sm2 cursor-pointer border border-line bg-transparent text-ink px-[16px] py-[13px] transition-[transform,background,border-color,box-shadow] duration-[120ms,200ms,200ms,200ms] inline-flex items-center justify-center gap-[9px] select-none active:scale-[.96] disabled:opacity-[.34] disabled:cursor-not-allowed [-webkit-tap-highlight-color:transparent] flex-1 h-[48px]"
                onClick={() => setSheet(null)}
              >
                {t('resign.no')}
              </button>
              <button
                className="font-mono text-[12px] tracking-[.14em] uppercase font-semibold rounded-sm2 cursor-pointer border border-[color-mix(in_srgb,var(--danger)_40%,transparent)] bg-panel-2 text-danger px-[16px] py-[13px] transition-[transform,background,border-color,box-shadow] duration-[120ms,200ms,200ms,200ms] inline-flex items-center justify-center gap-[9px] select-none active:scale-[.96] [-webkit-tap-highlight-color:transparent] flex-1 h-[48px]"
                onClick={() => { setSheet(null); onResign(); }}
              >
                {t('resign.yes')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* history sheet — full move log for deducing the enemy sub (spec §5) */}
      {sheet === 'history' && (
        <div className={SHEET_WRAP} onClick={() => setSheet(null)}>
          <div className={SHEET} onClick={(e) => e.stopPropagation()}>
            <div className={ROW + ' ' + BETWEEN + ' items-center mb-[14px]'}>
              <div className={KICKER}>{t('play.history')}</div>
              <button
                type="button"
                className="font-mono text-[16px] text-muted cursor-pointer leading-none px-2 [-webkit-tap-highlight-color:transparent]"
                onClick={() => setSheet(null)}
                aria-label={t('nav.back')}
              >
                ✕
              </button>
            </div>
            {log.length === 0 ? (
              <p className={MUTED + ' text-[13px] leading-[1.5]'}>{t('play.historyEmpty')}</p>
            ) : (
              <div className={LOG + ' thin-scroll max-h-[50dvh] overflow-y-auto flex flex-col-reverse pr-[6px]'}>
                {log.slice().reverse().map((l) => (
                  <div className={LOG_ROW} key={l.id}>
                    <span className={LOG_T}>›</span>
                    <span className={`${l.who === 'me' ? LOG_ME : l.who === 'en' ? LOG_EN : LOG_HIT} flex-1`}>
                      {lang === 'vi' ? l.vi : l.en}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
