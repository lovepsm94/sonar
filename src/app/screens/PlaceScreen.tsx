'use client';
import { useState } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { Board } from '../board/Board';
import { SCREEN, BTN_PRIMARY, KICKER, TITLE, MUTED, HUD_CARD, CHIP, ROW, COL } from './ui';
import type { Cell, GameState } from '@/game/types';

const colLabel = (c: Cell) => String.fromCharCode(65 + c.x) + (c.y + 1);

export function PlaceScreen({ state, onPlace }: { state: GameState; onPlace: (c: Cell) => void }) {
  const { t } = useI18n();
  const [picked, setPicked] = useState<Cell | null>(null);

  const waterCells: Cell[] = [];
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 10; x++) {
      if (!state.map.islands[y][x]) waterCells.push({ x, y });
    }
  }

  return (
    <div className={SCREEN + ' !pt-[clamp(10px,2vh,16px)] !pb-[clamp(8px,1.6vh,24px)] !px-[clamp(8px,3vw,18px)]'}>
      {/* Header + board centered as one unit so the prompt sits right above the map. */}
      <div className="grow min-h-0 flex flex-col justify-center gap-[clamp(8px,1.6vh,16px)]">
        <div className={COL + ' gap-1'}>
          <div className={KICKER}>{t('place.kicker')}</div>
          <h2 className={TITLE + ' text-[26px]'}>{t('place.prompt')}</h2>
          <div className={MUTED + ' text-[12.5px]'}>{t('place.hint')}</div>
        </div>

        <div className="w-full aspect-square max-h-[calc(100%-8rem)] mx-auto">
          <Board
            state={state}
            mode="place"
            highlight={picked ? [] : waterCells}
            selected={picked}
            onCellClick={(c) => setPicked(c)}
          />
        </div>

        {/* Confirm bar — always rendered (reserves height so the layout never jumps);
            only revealed once a cell is picked. Sits right under the board. */}
        <div
          className={ROW + ' justify-between items-center ' + HUD_CARD + ' transition-opacity duration-200'}
          style={{ opacity: picked ? 1 : 0, pointerEvents: picked ? 'auto' : 'none' }}
          aria-hidden={!picked}
        >
          <div className={ROW + ' items-center gap-[10px]'}>
            <span className={CHIP + ' border-accent text-accent'}>
              {picked ? colLabel(picked) : '—'}
            </span>
            <span className={MUTED + ' text-[12px]'}>{t('place.selected')}</span>
          </div>
          <button
            className={BTN_PRIMARY + ' py-[11px] px-5'}
            onClick={() => picked && onPlace(picked)}
            tabIndex={picked ? 0 : -1}
          >
            {t('place.dive')} ↓
          </button>
        </div>
      </div>
    </div>
  );
}
