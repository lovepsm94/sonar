'use client';
import { useCallback, useRef, useState } from 'react';
import type { GameMap, GameState, Side } from '@/game/types';
import { initState } from '@/game/engine';
import type { LocalAction, WireMessage } from '@/game/protocol';
import { PeerLink } from '@/net/webrtc';
import { GameLoop } from './gameLoop';

export function useGame() {
  const [state, setState] = useState<GameState | null>(null);
  const [connLost, setConnLost] = useState(false);
  const link = useRef<PeerLink | null>(null);
  const loop = useRef<GameLoop | null>(null);
  const sideRef = useRef<Side>('host');
  const onAppliedRef = useRef<((msg: WireMessage, prev: GameState, next: GameState) => void) | undefined>(undefined);

  const attach = useCallback((
    pl: PeerLink,
    map: GameMap,
    side: Side,
    onApplied?: (msg: WireMessage, prev: GameState, next: GameState) => void,
  ) => {
    link.current = pl;
    sideRef.current = side;
    onAppliedRef.current = onApplied;
    setConnLost(false);
    const gl = new GameLoop(pl, map, side);
    loop.current = gl;
    setState(gl.state);
    pl.onMessage = (m: WireMessage) => {
      const gameLoop = loop.current;
      if (!gameLoop) return;
      // Sends happen inside receive() — a plain call, run once per frame.
      // NEVER move this into the setState updater: React may invoke updaters
      // twice (StrictMode), which would double-send every wire message.
      const prev = gameLoop.state;
      const next = gameLoop.receive(m);
      setState(next);
      onAppliedRef.current?.(m, prev, next);
    };
    pl.onClose = () => setConnLost(true);
  }, []);

  /** Reset to a fresh round (new map) on the SAME connection — used for rematch. */
  const reset = useCallback((map: GameMap) => {
    setConnLost(false);
    const pl = link.current;
    if (pl) {
      const gl = new GameLoop(pl, map, sideRef.current);
      loop.current = gl;
      setState(gl.state);
    } else {
      loop.current = null;
      setState(initState(map, sideRef.current));
    }
  }, []);

  // Returns whether the engine actually accepted the action. The engine returns the
  // SAME state object when it rejects (wrong turn, not enough energy, blocked path), so
  // a reference change means "applied". Callers use this to avoid narrating FX/log for
  // a rejected action.
  const dispatch = useCallback((a: LocalAction): boolean => {
    const gameLoop = loop.current;
    if (!gameLoop || !link.current) return false;
    const prev = gameLoop.state;
    const next = gameLoop.dispatch(a);
    setState(next);
    return next !== prev;
  }, []);

  return { state, attach, dispatch, reset, link, connLost };
}
