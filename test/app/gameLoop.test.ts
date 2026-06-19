// test/app/gameLoop.test.ts
// Regression coverage for the peer game loop: every outgoing wire message must
// be sent EXACTLY ONCE per event. The original bug performed sends inside React
// setState updaters, which React invokes twice under StrictMode (dev) — so each
// `torpedo` frame was transmitted twice and a single shot sank a 2-HP sub in one
// hit (the engine applies one HP decrement per received frame, by design).
import { describe, it, expect } from 'vitest';
import { GameLoop, type Transport } from '@/app/gameLoop';
import { GRID, START_HP, COST, SURFACE_SKIP, type Cell, type GameMap } from '@/game/types';

function blankMap(): GameMap {
  const islands = Array.from({ length: GRID }, () => Array.from({ length: GRID }, () => false));
  return { seed: 1, size: GRID, islands };
}

/** Force a loop into a 'playing' state with a known submarine position. */
function intoPlaying(loop: GameLoop, pos: Cell) {
  loop.state = {
    ...loop.state,
    phase: 'playing',
    iPlaced: true,
    enemyPlaced: true,
    me: { ...loop.state.me, pos, hp: START_HP, energy: COST.torpedo },
  };
}

describe('GameLoop send-once invariant', () => {
  it('a fired torpedo emits exactly one wire frame', () => {
    const sent: string[] = [];
    const transport: Transport = { send: (m) => sent.push(m.t) };
    const host = new GameLoop(transport, blankMap(), 'host');
    intoPlaying(host, { x: 5, y: 5 });

    host.dispatch({ kind: 'torpedo', target: { x: 3, y: 5 } }); // manhattan 2, in range
    expect(sent.filter((t) => t === 'torpedo')).toHaveLength(1);
  });
});

describe('GameLoop two-peer exchange', () => {
  // Wire two loops so each one's sends are delivered to the other.
  function connect() {
    let host!: GameLoop;
    let guest!: GameLoop;
    host = new GameLoop({ send: (m) => guest.receive(m) }, blankMap(), 'host');
    guest = new GameLoop({ send: (m) => host.receive(m) }, blankMap(), 'guest');
    return { host, guest };
  }

  it('a single torpedo hit reduces the defender by exactly one HP — not a one-shot kill', () => {
    const { host, guest } = connect();
    intoPlaying(host, { x: 5, y: 5 });
    intoPlaying(guest, { x: 3, y: 5 }); // host fires here; manhattan 2

    host.dispatch({ kind: 'torpedo', target: { x: 3, y: 5 } });

    expect(guest.state.me.hp).toBe(START_HP - 1); // 1, still alive
    expect(guest.state.phase).toBe('playing');
    expect(guest.state.winner).toBeNull();
    expect(host.state.enemy.hp).toBe(START_HP - 1);
    expect(host.state.phase).toBe('playing');
  });

  it('it takes two hits to sink a START_HP=2 sub', () => {
    const { host, guest } = connect();
    intoPlaying(host, { x: 5, y: 5 });
    intoPlaying(guest, { x: 3, y: 5 });

    host.dispatch({ kind: 'torpedo', target: { x: 3, y: 5 } }); // hp 2 -> 1
    // Reset to a legal "host's turn again" state on BOTH peers (energy refilled, and the
    // guest's view set back to the host's turn) so the second shot isn't rejected as an
    // out-of-turn enemy action. Guest stays at the same position.
    host.state = { ...host.state, turn: 'host', me: { ...host.state.me, energy: COST.torpedo } };
    guest.state = { ...guest.state, turn: 'host' };
    host.dispatch({ kind: 'torpedo', target: { x: 3, y: 5 } }); // hp 1 -> 0

    expect(guest.state.me.hp).toBe(0);
    expect(guest.state.phase).toBe('over');
    expect(guest.state.winner).toBe('host');
    expect(host.state.phase).toBe('over');
    expect(host.state.winner).toBe('host');
  });
});

describe('GameLoop surface skip cancellation', () => {
  function connect() {
    let host!: GameLoop;
    let guest!: GameLoop;
    host = new GameLoop({ send: (m) => guest.receive(m) }, blankMap(), 'host');
    guest = new GameLoop({ send: (m) => host.receive(m) }, blankMap(), 'guest');
    return { host, guest };
  }

  it('mutual back-to-back surfaces annihilate the skip streaks (3 vs 3 → normal play)', () => {
    const { host, guest } = connect();
    intoPlaying(host, { x: 5, y: 5 });
    intoPlaying(guest, { x: 2, y: 2 });

    // Host surfaces → guest is granted SURFACE_SKIP consecutive turns.
    host.dispatch({ kind: 'surface' });
    expect(host.state.enemyExtraTurns).toBe(SURFACE_SKIP);
    expect(host.state.turn).toBe('guest');
    expect(guest.state.myExtraTurns).toBe(SURFACE_SKIP);
    expect(guest.state.turn).toBe('guest');

    // Guest immediately surfaces back. Both skip streaks (3 vs 3) overlap and cancel,
    // so neither side sits out — play resumes alternating, starting with host.
    guest.dispatch({ kind: 'surface' });

    expect(guest.state.myExtraTurns).toBe(0);
    expect(guest.state.enemyExtraTurns).toBe(0);
    expect(guest.state.turn).toBe('host');

    // Both peers stay in sync.
    expect(host.state.myExtraTurns).toBe(0);
    expect(host.state.enemyExtraTurns).toBe(0);
    expect(host.state.turn).toBe('host');
  });

  it('partial overlap cancels one-for-one (guest spends 1 bonus turn, then surfaces)', () => {
    const { host, guest } = connect();
    intoPlaying(host, { x: 5, y: 5 });
    intoPlaying(guest, { x: 2, y: 2 });

    host.dispatch({ kind: 'surface' }); // guest +3
    guest.dispatch({ kind: 'move', dir: 'S' }); // guest spends one bonus turn (3 → 2)
    expect(guest.state.myExtraTurns).toBe(SURFACE_SKIP - 1);

    guest.dispatch({ kind: 'surface' }); // guest skips 3; cancels its own remaining 2 → host +1

    expect(guest.state.myExtraTurns).toBe(0);
    expect(guest.state.enemyExtraTurns).toBe(1);
    expect(guest.state.turn).toBe('host');

    expect(host.state.myExtraTurns).toBe(1);
    expect(host.state.enemyExtraTurns).toBe(0);
    expect(host.state.turn).toBe('host');
  });
});
