'use client';
import { useCallback, useMemo, useRef, useState } from 'react';
import type { Cell, GameMap } from '@/game/types';
import {
  compute, silenceFan, advancePinned,
  type Decl, type Pinned, type RadioState, type FanOption,
} from './radio';

/** The plot view-model handed to the board/PlayScreen when the plot is open. */
export interface RadioView extends RadioState {
  pinned: Pinned | null;
  fan: FanOption[] | null;
}

/**
 * "Radio Operator" — presentation-layer enemy tracker. Fed by the declared-move
 * stream (page.tsx onApplied), it maintains the auto candidate set and a single
 * manual hypothesis. Holds no game state; pure inference lives in ./radio.
 */
export function useRadioOperator(map: GameMap | null | undefined) {
  const [enabled, setEnabled] = useState(false);
  const [moves, setMoves] = useState<Decl[]>([]);
  const [pinned, setPinned] = useState<Pinned | null>(null);

  const mapRef = useRef(map);
  mapRef.current = map;
  const movesRef = useRef<Decl[]>(moves);
  const pinnedRef = useRef<Pinned | null>(pinned);
  const setMovesBoth = (next: Decl[]) => { movesRef.current = next; setMoves(next); };
  const setPinnedBoth = (next: Pinned | null) => { pinnedRef.current = next; setPinned(next); };

  /** Record one enemy declaration off the wire and steer the pinned hypothesis. */
  const record = useCallback((decl: Decl) => {
    setMovesBoth([...movesRef.current, decl]);
    if (mapRef.current) setPinnedBoth(advancePinned(pinnedRef.current, decl, mapRef.current));
  }, []);

  const reset = useCallback(() => {
    setMovesBoth([]);
    setPinnedBoth(null);
    setEnabled(false);
  }, []);

  const toggle = useCallback(() => setEnabled((v) => !v), []);

  const base = useMemo(() => (map ? compute(moves, map) : null), [map, moves]);

  const ro = useMemo<RadioView | null>(() => {
    if (!enabled || !map || !base) return null;
    const fan = pinned && pinned.fanning
      ? silenceFan(map, pinned.fanFrom ?? pinned.pos, pinned.trail)
      : null;
    return { ...base, pinned, fan };
  }, [enabled, map, base, pinned, moves]);

  // Badge count: shown even when the plot is closed (null until the enemy has acted).
  const roCount = base && moves.length ? base.count : null;

  /** Tap a plot cell: resolve a silence fan, toggle-off a re-tap, or pin a new hypothesis. */
  const pinCell = useCallback((cell: Cell) => {
    const m = mapRef.current;
    if (!m) return;
    const cur = pinnedRef.current;
    if (cur && cur.fanning) {
      const fan = silenceFan(m, cur.fanFrom ?? cur.pos, cur.trail);
      const opt = fan.find((o) => o.cell.x === cell.x && o.cell.y === cell.y);
      if (opt) { setPinnedBoth({ pos: cell, trail: [...cur.trail, ...opt.path.slice(1)], fanning: false }); }
      return;
    }
    if (cur && cur.pos.x === cell.x && cur.pos.y === cell.y) { setPinnedBoth(null); return; } // re-tap = unpin
    const trail = compute(movesRef.current, m).repTrail.get(cell.x + ',' + cell.y) ?? [cell];
    setPinnedBoth({ pos: cell, trail, fanning: false });
  }, []);

  const clearPin = useCallback(() => setPinnedBoth(null), []);

  return { enabled, toggle, ro, roCount, record, pinCell, clearPin, reset };
}
