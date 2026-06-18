// src/app/gameLoop.ts
import { applyLocal, applyRemote, initState } from '@/game/engine';
import type { GameMap, GameState, Side } from '@/game/types';
import type { LocalAction, WireMessage } from '@/game/protocol';

/** Anything that can put a wire message onto the DataChannel (a PeerLink). */
export interface Transport {
  send(m: WireMessage): void;
}

/**
 * Framework-agnostic peer game loop. Owns the authoritative {@link GameState}
 * and runs the engine, sending each resulting wire message EXACTLY ONCE.
 *
 * Network sends live here — in plain method calls invoked once per event — and
 * must NEVER be moved back inside a React `setState` updater. React may invoke
 * updater functions more than once (guaranteed on every update under StrictMode
 * in dev), which would transmit every wire message twice. A doubled `torpedo`
 * frame is applied twice by the defending peer's engine (one HP decrement per
 * received frame, by design), so a single shot would sink a full-HP sub in one
 * hit. Keeping sends out of the updater is the fix.
 */
export class GameLoop {
  state: GameState;

  constructor(
    private readonly transport: Transport,
    map: GameMap,
    side: Side,
  ) {
    this.state = initState(map, side);
  }

  /** Apply one of THIS player's actions; send the resulting wire messages once. */
  dispatch(action: LocalAction): GameState {
    const { state, outgoing } = applyLocal(this.state, action);
    this.state = state;
    outgoing.forEach((o) => this.transport.send(o));
    return state;
  }

  /** Apply one message received from the peer; send any replies once. */
  receive(msg: WireMessage): GameState {
    const { state, outgoing } = applyRemote(this.state, msg);
    this.state = state;
    outgoing.forEach((o) => this.transport.send(o));
    return state;
  }
}
