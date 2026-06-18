// test/game/engine.test.ts
import { describe, it, expect } from 'vitest';
import { initState } from '@/game/engine';
import { generateMap } from '@/game/map';
import { MAX_ENERGY, START_HP } from '@/game/types';

describe('initState', () => {
  it('starts in placing phase with full hp and zero energy', () => {
    const s = initState(generateMap(42), 'host');
    expect(s.phase).toBe('placing');
    expect(s.me.hp).toBe(START_HP);
    expect(s.enemy.hp).toBe(START_HP);
    expect(s.me.energy).toBe(0);
    expect(s.iPlaced).toBe(false);
    expect(s.enemyPlaced).toBe(false);
    expect(s.turn).toBe('host'); // host acts first once playing
    expect(s.winner).toBeNull();
    expect(MAX_ENERGY).toBe(4);
  });
});

import { applyLocal } from '@/game/engine';
import { GRID } from '@/game/types';
import type { Cell, GameMap } from '@/game/types';

// Controlled, island-free map so action tests don't depend on random layout.
// Pass island coordinates to carve specific obstacles.
function blankMap(islands: Cell[] = []): GameMap {
  const grid = Array.from({ length: GRID }, () => Array.from({ length: GRID }, () => false));
  islands.forEach((c) => { grid[c.y][c.x] = true; });
  return { seed: 1, size: GRID, islands: grid };
}

describe('applyLocal place', () => {
  it('places my sub on a water cell and emits "placed"', () => {
    const cell = { x: 5, y: 5 };
    const s0 = initState(blankMap(), 'host');
    const { state, outgoing } = applyLocal(s0, { kind: 'place', cell });
    expect(state.iPlaced).toBe(true);
    expect(state.me.pos).toEqual(cell);
    expect(outgoing).toEqual([{ t: 'placed' }]);
  });

  it('rejects placing on an island', () => {
    const island = { x: 3, y: 3 };
    const s0 = initState(blankMap([island]), 'host');
    const { state, outgoing } = applyLocal(s0, { kind: 'place', cell: island });
    expect(state.iPlaced).toBe(false);
    expect(outgoing).toEqual([]);
  });
});

import { MAX_ENERGY as MAXE } from '@/game/types';

// Host placed at center {5,5} on an island-free map; enemy already placed.
// Center has free water in every direction, so move/silence/torpedo tests are stable.
function playingState() {
  let s = initState(blankMap(), 'host');
  s = { ...s, enemyPlaced: true };
  s = applyLocal(s, { kind: 'place', cell: { x: 5, y: 5 } }).state;
  return s; // phase 'playing', turn 'host', me at {5,5}
}

describe('applyLocal move', () => {
  it('moves N, gains +1 energy, records trail, passes turn', () => {
    const s = playingState();
    const before = s.me.pos;
    const { state, outgoing } = applyLocal(s, { kind: 'move', dir: 'N' });
    expect(state.me.pos).toEqual({ x: before.x, y: before.y - 1 });
    expect(state.me.energy).toBe(1);
    expect(state.me.trail).toContainEqual(before);
    expect(state.turn).toBe('guest');
    expect(state.turnNumber).toBe(1);
    expect(outgoing).toEqual([{ t: 'move', dir: 'N' }]);
  });

  it('rejects moving into own trail', () => {
    let s = playingState();
    s = applyLocal(s, { kind: 'move', dir: 'N' }).state; // now guest's turn
    s = { ...s, turn: 'host' }; // force back for the test
    const { state, outgoing } = applyLocal(s, { kind: 'move', dir: 'S' }); // back into trail cell
    expect(outgoing).toEqual([]);          // rejected
    expect(state.me.pos).toEqual(s.me.pos);
  });

  it('rejects an action when it is not my turn', () => {
    const s = { ...playingState(), turn: 'guest' as const };
    const { outgoing } = applyLocal(s, { kind: 'move', dir: 'N' });
    expect(outgoing).toEqual([]);
  });

  it('caps energy at MAX_ENERGY', () => {
    let s = playingState();
    s = { ...s, me: { ...s.me, energy: MAXE } };
    const { state } = applyLocal(s, { kind: 'move', dir: 'N' });
    expect(state.me.energy).toBe(MAXE);
  });
});

import { SURFACE_SKIP } from '@/game/types';
import { sectorOf as sec } from '@/game/geo';

describe('applyLocal surface', () => {
  it('resets trail, refills energy, declares sector, grants the enemy SURFACE_SKIP turns', () => {
    let s = playingState();
    s = applyLocal(s, { kind: 'move', dir: 'N' }).state; // build some trail
    s = { ...s, turn: 'host' };
    const { state, outgoing } = applyLocal(s, { kind: 'surface' });
    expect(state.me.trail).toEqual([]);
    expect(state.me.energy).toBe(MAXE);
    expect(state.enemyExtraTurns).toBe(SURFACE_SKIP);
    expect(state.turn).toBe('guest');
    expect(outgoing).toEqual([{ t: 'surface', sector: sec(state.me.pos), cell: state.me.pos }]);
    expect(state.me.surfaced).toBe(true);
  });
});

import { COST, SILENCE_MAX } from '@/game/types';

describe('applyLocal silence', () => {
  it('moves up to SILENCE_MAX cells in a straight line, costs energy, hides direction', () => {
    let s = playingState();
    s = { ...s, me: { ...s.me, energy: COST.silence } };
    const start = s.me.pos;
    const { state, outgoing } = applyLocal(s, { kind: 'silence', dir: 'S', dist: 2 });
    expect(state.me.pos).toEqual({ x: start.x, y: start.y + 2 });
    expect(state.me.energy).toBe(0);
    expect(outgoing).toEqual([{ t: 'silence' }]); // no direction leaked
    expect(state.me.trail).toContainEqual(start);
  });

  it('rejects silence without enough energy', () => {
    let s = playingState();
    s = { ...s, me: { ...s.me, energy: COST.silence - 1 } };
    const { outgoing } = applyLocal(s, { kind: 'silence', dir: 'S', dist: 2 });
    expect(outgoing).toEqual([]);
  });

  it('rejects silence path crossing island/trail/out-of-bounds', () => {
    let s = playingState();
    s = { ...s, me: { ...s.me, energy: COST.silence } };
    const { outgoing } = applyLocal(s, { kind: 'silence', dir: 'S', dist: SILENCE_MAX + 1 });
    expect(outgoing).toEqual([]); // dist out of allowed range
  });
});

import { TORPEDO_RANGE } from '@/game/types';

describe('applyLocal torpedo/sonar requests', () => {
  it('fires torpedo at an in-range cell, costs energy, emits torpedo with a nonce', () => {
    let s = playingState();
    s = { ...s, me: { ...s.me, energy: COST.torpedo } };
    const target = { x: s.me.pos.x, y: Math.max(0, s.me.pos.y - 1) };
    const { state, outgoing } = applyLocal(s, { kind: 'torpedo', target });
    expect(state.me.energy).toBe(0);
    expect(outgoing).toHaveLength(1);
    expect(outgoing[0]).toMatchObject({ t: 'torpedo', target });
    expect((outgoing[0] as any).nonce).toBeGreaterThan(0);
    expect(state.turn).toBe('guest');
  });

  it('rejects torpedo out of range', () => {
    let s = playingState();
    s = { ...s, me: { ...s.me, energy: COST.torpedo, pos: { x: 0, y: 0 } } };
    const { outgoing } = applyLocal(s, { kind: 'torpedo', target: { x: 9, y: 9 } });
    expect(outgoing).toEqual([]);
  });

  it('emits sonar request and costs energy', () => {
    let s = playingState();
    s = { ...s, me: { ...s.me, energy: COST.sonar } };
    const { state, outgoing } = applyLocal(s, { kind: 'sonar' });
    expect(state.me.energy).toBe(0);
    expect(outgoing[0]).toMatchObject({ t: 'sonar-req' });
  });
});

import { applyRemote } from '@/game/engine';

describe('applyRemote movement/surface', () => {
  it('marks enemy placed and starts playing when I already placed', () => {
    let s = initState(blankMap(), 'host');
    s = applyLocal(s, { kind: 'place', cell: { x: 5, y: 5 } }).state; // iPlaced, still placing
    const { state } = applyRemote(s, { t: 'placed' });
    expect(state.enemyPlaced).toBe(true);
    expect(state.phase).toBe('playing');
  });

  it('records enemy surface and grants me SURFACE_SKIP consecutive turns', () => {
    let s = playingState();
    s = { ...s, turn: 'guest' };
    const { state } = applyRemote(s, { t: 'surface', sector: 'D', cell: { x: 7, y: 7 } });
    expect(state.enemy.surfacedSector).toBe('D');
    expect(state.enemy.surfacedCell).toEqual({ x: 7, y: 7 });
    expect(state.myExtraTurns).toBe(3);
    expect(state.turn).toBe('host'); // I start my bonus turns
  });

  it('clears the surfaced reveal (sector + cell) once the enemy re-submerges by moving', () => {
    let s = playingState();
    s = { ...s, turn: 'guest' };
    s = applyRemote(s, { t: 'surface', sector: 'D', cell: { x: 7, y: 7 } }).state;
    s = { ...s, turn: 'guest', myExtraTurns: 0 }; // skip past my bonus turns to the enemy's move
    const { state } = applyRemote(s, { t: 'move', dir: 'N' });
    // Both must clear together — a lingering sector would re-tint the whole 5×5 as a
    // stale "possible area" even though the move is announced and trackable.
    expect(state.enemy.surfacedCell).toBeNull();
    expect(state.enemy.surfacedSector).toBeNull();
  });

  it('after I surface, the enemy plays exactly SURFACE_SKIP turns then control returns to me', () => {
    let s = playingState();                              // my (host) turn
    s = applyLocal(s, { kind: 'surface' }).state;        // enemyExtraTurns=3, turn=guest
    expect(s.turn).toBe('guest');
    s = applyRemote(s, { t: 'move', dir: 'N' }).state;   // enemy turn 1
    expect(s.turn).toBe('guest');
    s = applyRemote(s, { t: 'move', dir: 'S' }).state;   // enemy turn 2
    expect(s.turn).toBe('guest');
    s = applyRemote(s, { t: 'move', dir: 'N' }).state;   // enemy turn 3
    expect(s.turn).toBe('host');                         // back to me
  });
});

describe('applyRemote torpedo (defender computes)', () => {
  it('reports a hit and reduces my hp when the target is my position', () => {
    let s = playingState();           // me = defender here
    s = { ...s, turn: 'guest' };
    const target = s.me.pos;
    const { state, outgoing } = applyRemote(s, { t: 'torpedo', target, nonce: 7 });
    expect(state.me.hp).toBe(START_HP - 1);
    expect(outgoing).toEqual([{ t: 'torpedo-res', nonce: 7, hit: true, hitCell: target, defenderHp: START_HP - 1 }]);
  });

  it('reports a miss and keeps my hp when target is elsewhere', () => {
    let s = playingState();
    s = { ...s, turn: 'guest' };
    const miss = { x: (s.me.pos.x + 1) % 10, y: s.me.pos.y };
    const { state, outgoing } = applyRemote(s, { t: 'torpedo', target: miss, nonce: 8 });
    expect(state.me.hp).toBe(START_HP);
    expect(outgoing[0]).toMatchObject({ t: 'torpedo-res', hit: false, defenderHp: START_HP });
  });

  it('attacker applies torpedo-res: records hit cell and enemy hp', () => {
    let s = playingState();           // me = attacker
    const res = { t: 'torpedo-res', nonce: 1, hit: true, hitCell: { x: 4, y: 4 }, defenderHp: 2 } as const;
    const { state } = applyRemote(s, res);
    expect(state.enemy.hp).toBe(2);
    expect(state.enemy.lastHitCell).toEqual({ x: 4, y: 4 });
  });

  it('clears the hit marker (red ✕) when my next turn ends', () => {
    let s = playingState();           // me = attacker, my turn
    // A hit was recorded as control returned to me.
    s = applyRemote(s, { t: 'torpedo-res', nonce: 1, hit: true, hitCell: { x: 4, y: 4 }, defenderHp: 2 }).state;
    expect(s.enemy.lastHitCell).toEqual({ x: 4, y: 4 }); // visible during my turn
    // Taking my next turn-ending action drops the marker.
    const { state } = applyLocal(s, { kind: 'move', dir: 'N' });
    expect(state.enemy.lastHitCell).toBeNull();
  });

  it('sets winner when defender hp reaches 0', () => {
    let s = playingState();
    s = { ...s, turn: 'guest', me: { ...s.me, hp: 1 } };
    const { state } = applyRemote(s, { t: 'torpedo', target: s.me.pos, nonce: 9 });
    expect(state.me.hp).toBe(0);
    expect(state.phase).toBe('over');
    expect(state.winner).toBe('guest'); // the attacker (other side) wins
  });
});

describe('sonar reveal mechanic', () => {
  it('sonar-req: defender owes an answer — sets pendingSonar, ends enemy turn, no auto-reply', () => {
    let s = playingState();              // me = host (defender)
    s = { ...s, turn: 'guest' };         // enemy's turn (they ping)
    const { state, outgoing } = applyRemote(s, { t: 'sonar-req', nonce: 5 });
    expect(state.pendingSonar).toBe(5);
    expect(outgoing).toEqual([]);        // no clues auto-sent
    expect(state.turn).toBe('host');     // enemy's sonar turn ended -> my turn
  });

  it('sonar-reveal col: answers with my true column (x), sends sonar-res, clears pendingSonar', () => {
    let s = playingState();              // me at {5,5}
    s = { ...s, pendingSonar: 5 };
    const { state, outgoing } = applyLocal(s, { kind: 'sonar-reveal', axis: 'col' });
    expect(outgoing).toEqual([{ t: 'sonar-res', nonce: 5, axis: 'col', value: 5 }]);
    expect(state.me.revealedLine).toEqual({ axis: 'col', value: 5 });
    expect(state.pendingSonar).toBeNull();
  });

  it('sonar-reveal row: answers with my true row (y)', () => {
    let s = playingState();
    s = { ...s, pendingSonar: 9, me: { ...s.me, pos: { x: 2, y: 7 } } };
    const { outgoing } = applyLocal(s, { kind: 'sonar-reveal', axis: 'row' });
    expect(outgoing).toEqual([{ t: 'sonar-res', nonce: 9, axis: 'row', value: 7 }]);
  });

  it('sonar-reveal with no pending sonar is a no-op', () => {
    const s = playingState();
    const { state, outgoing } = applyLocal(s, { kind: 'sonar-reveal', axis: 'row' });
    expect(outgoing).toEqual([]);
    expect(state).toBe(s);
  });

  it('sonar-res: attacker records the enemy revealed line', () => {
    const s = playingState();            // me = attacker
    const { state, outgoing } = applyRemote(s, { t: 'sonar-res', nonce: 5, axis: 'row', value: 3 });
    expect(state.enemy.revealedLine).toEqual({ axis: 'row', value: 3 });
    expect(outgoing).toEqual([]);
  });

  it('a subsequent enemy move clears the stale enemy revealed line', () => {
    let s = playingState();
    s = { ...s, turn: 'guest', enemy: { ...s.enemy, revealedLine: { axis: 'row', value: 3 } } };
    const { state } = applyRemote(s, { t: 'move', dir: 'N' });
    expect(state.enemy.revealedLine).toBeNull();
  });
});

describe('engine review regressions', () => {
  it('defender torpedo (miss) advances the turn back to the defender', () => {
    let s = playingState();                 // me = host
    s = { ...s, turn: 'guest' };            // enemy's turn (they fire)
    const miss = { x: (s.me.pos.x + 1) % 10, y: s.me.pos.y };
    const { state } = applyRemote(s, { t: 'torpedo', target: miss, nonce: 8 });
    expect(state.turn).toBe('host');        // enemy's torpedo turn ended -> my turn
  });

  it('rejects move out of bounds', () => {
    let s = initState(blankMap(), 'host');
    s = { ...s, enemyPlaced: true };
    s = applyLocal(s, { kind: 'place', cell: { x: 0, y: 0 } }).state;
    const { outgoing } = applyLocal(s, { kind: 'move', dir: 'N' }); // y = -1
    expect(outgoing).toEqual([]);
  });

  it('rejects move into an island', () => {
    let s = initState(blankMap([{ x: 5, y: 4 }]), 'host');
    s = { ...s, enemyPlaced: true };
    s = applyLocal(s, { kind: 'place', cell: { x: 5, y: 5 } }).state;
    const { outgoing } = applyLocal(s, { kind: 'move', dir: 'N' }); // into island {5,4}
    expect(outgoing).toEqual([]);
  });

  it('rejects silence whose path crosses an island', () => {
    let s = initState(blankMap([{ x: 5, y: 3 }]), 'host');
    s = { ...s, enemyPlaced: true };
    s = applyLocal(s, { kind: 'place', cell: { x: 5, y: 5 } }).state;
    s = { ...s, me: { ...s.me, energy: COST.silence } };
    const { outgoing } = applyLocal(s, { kind: 'silence', dir: 'N', dist: 3 }); // crosses {5,3}
    expect(outgoing).toEqual([]);
  });

  it('enemy sonar-req during surface extra-turns consumes one skip and still sets pendingSonar', () => {
    let s = playingState();                                // my (host) turn, me at {5,5}
    s = applyLocal(s, { kind: 'surface' }).state;          // enemyExtraTurns=SURFACE_SKIP, turn=guest
    expect(s.enemyExtraTurns).toBe(SURFACE_SKIP);
    const { state } = applyRemote(s, { t: 'sonar-req', nonce: 11 }); // enemy pings on extra-turn 1
    expect(state.pendingSonar).toBe(11);                  // I still owe a reveal
    expect(state.enemyExtraTurns).toBe(SURFACE_SKIP - 1); // one extra turn consumed
    expect(state.turn).toBe('guest');                     // enemy keeps the remaining extra turns
  });

  // The peer is untrusted: applyRemote must not corrupt a finished game, nor apply
  // an enemy *action* that arrives when it isn't the enemy's turn.
  it('ignores a near-simultaneous enemy resign after I already conceded', () => {
    let s = playingState();                         // me = host, my turn
    s = applyLocal(s, { kind: 'resign' }).state;    // I concede -> guest wins, game over
    expect(s.winner).toBe('guest');
    const { state } = applyRemote(s, { t: 'resign' }); // enemy's resign crosses the wire
    expect(state.winner).toBe('guest');             // I do NOT flip to declaring myself winner
    expect(state.phase).toBe('over');
  });

  it('ignores any enemy frame once the game is over', () => {
    let s = playingState();
    s = { ...s, phase: 'over', winner: 'host' };
    const { state, outgoing } = applyRemote(s, { t: 'torpedo', target: s.me.pos, nonce: 1 });
    expect(state.me.hp).toBe(START_HP);             // hp untouched
    expect(state.winner).toBe('host');              // winner untouched
    expect(outgoing).toEqual([]);                   // no stray reply
  });

  it('drops an enemy action that arrives when it is my turn', () => {
    const s = playingState();                       // turn = host (mine)
    const { state, outgoing } = applyRemote(s, { t: 'move', dir: 'N' });
    expect(state).toBe(s);                          // unchanged, turn not advanced
    expect(outgoing).toEqual([]);
  });

  it('still accepts a torpedo-res reply during my own extra-turn', () => {
    // After the enemy surfaces I own SURFACE_SKIP turns; a reply to a torpedo I fired
    // on one of those turns arrives while it is still my turn — it must NOT be dropped.
    let s = playingState();
    s = { ...s, turn: 'host', myExtraTurns: 2 };     // mid extra-turn streak, my turn
    const { state } = applyRemote(s, { t: 'torpedo-res', nonce: 1, hit: true, hitCell: { x: 4, y: 4 }, defenderHp: 2 });
    expect(state.enemy.hp).toBe(2);                  // reply applied
    expect(state.enemy.lastHitCell).toEqual({ x: 4, y: 4 });
  });

});
