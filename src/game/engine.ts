// src/game/engine.ts
import {
  START_HP, MAX_ENERGY, SURFACE_SKIP, SILENCE_MAX, COST, TORPEDO_RANGE,
  type GameMap, type GameState, type Side, type Cell, type SubState,
} from './types';
import { inBounds, step, sameCell, sectorOf, manhattan } from './geo';
import type { LocalAction, WireMessage } from './protocol';

export function initState(map: GameMap, side: Side): GameState {
  return {
    map,
    side,
    phase: 'placing',
    turn: 'host',
    turnNumber: 0,
    me: { pos: { x: 0, y: 0 }, trail: [], hp: START_HP, energy: 0, alive: true, surfaced: false, revealedLine: null },
    enemy: { hp: START_HP, surfacedSector: null, surfacedCell: null, lastHitCell: null, revealedLine: null },
    myExtraTurns: 0,
    enemyExtraTurns: 0,
    iPlaced: false,
    enemyPlaced: false,
    winner: null,
    nextNonce: 1,
    pendingSonar: null,
  };
}

export interface LocalResult { state: GameState; outgoing: WireMessage[] }

function isIsland(s: GameState, c: Cell): boolean {
  return s.map.islands[c.y][c.x];
}
function isWater(s: GameState, c: Cell): boolean {
  return inBounds(c) && !isIsland(s, c);
}

function occupied(s: GameState, c: Cell): boolean {
  return s.me.trail.some((t) => sameCell(t, c)) || sameCell(s.me.pos, c);
}

function isMyTurn(s: GameState): boolean {
  return s.phase === 'playing' && s.turn === s.side && s.winner === null;
}

function other(side: Side): Side {
  return side === 'host' ? 'guest' : 'host';
}

function endMyTurn(s: GameState): GameState {
  let myExtraTurns = s.myExtraTurns;
  let turn: Side;
  if (myExtraTurns > 0) {
    myExtraTurns -= 1;
    turn = myExtraTurns > 0 ? s.side : other(s.side);
  } else {
    turn = other(s.side);
  }
  // The red ✕ "you hit here" marker is a one-turn indicator. A torpedo-res sets it
  // as control returns to me (the turn after I fired), so clearing it when my turn
  // ends shows it for exactly that turn and stops it from permanently revealing
  // where the enemy was.
  const enemy = s.enemy.lastHitCell ? { ...s.enemy, lastHitCell: null } : s.enemy;
  return { ...s, enemy, turn, myExtraTurns, turnNumber: s.turnNumber + 1 };
}

function addEnergy(me: SubState, delta: number): SubState {
  return { ...me, energy: Math.min(MAX_ENERGY, me.energy + delta) };
}

export function applyLocal(s: GameState, a: LocalAction): LocalResult {
  switch (a.kind) {
    case 'place': {
      if (s.phase !== 'placing' || s.iPlaced || !isWater(s, a.cell)) return { state: s, outgoing: [] };
      const me = { ...s.me, pos: a.cell, trail: [] };
      const iPlaced = true;
      const phase = iPlaced && s.enemyPlaced ? 'playing' as const : s.phase;
      return { state: { ...s, me, iPlaced, phase }, outgoing: [{ t: 'placed' }] };
    }
    case 'move': {
      if (!isMyTurn(s)) return { state: s, outgoing: [] };
      const target = step(s.me.pos, a.dir);
      if (!isWater(s, target) || occupied(s, target)) return { state: s, outgoing: [] };
      let me: SubState = { ...s.me, trail: [...s.me.trail, s.me.pos], pos: target, surfaced: false, revealedLine: null };
      me = addEnergy(me, 1);
      const next = endMyTurn({ ...s, me });
      return { state: next, outgoing: [{ t: 'move', dir: a.dir }] };
    }
    case 'surface': {
      if (!isMyTurn(s)) return { state: s, outgoing: [] };
      const me = { ...s.me, trail: [], energy: MAX_ENERGY, surfaced: true, revealedLine: null };
      const next: GameState = {
        ...s, me, myExtraTurns: 0, enemyExtraTurns: SURFACE_SKIP, turn: other(s.side), turnNumber: s.turnNumber + 1,
      };
      return { state: next, outgoing: [{ t: 'surface', sector: sectorOf(me.pos), cell: me.pos }] };
    }
    case 'silence': {
      if (!isMyTurn(s)) return { state: s, outgoing: [] };
      // dist 0 is intentionally legal — a "stay put silently" bluff that still ends the turn.
      // (The UI only offers 1..SILENCE_MAX; the engine accepts the full 0..SILENCE_MAX range.)
      if (a.dist < 0 || a.dist > SILENCE_MAX) return { state: s, outgoing: [] };
      if (s.me.energy < COST.silence) return { state: s, outgoing: [] };
      const startPos = s.me.pos;
      const trail = [...s.me.trail];
      let pos = s.me.pos;
      for (let i = 0; i < a.dist; i++) {
        const nxt = step(pos, a.dir);
        if (!isWater(s, nxt)) return { state: s, outgoing: [] };
        if (trail.some((t) => sameCell(t, nxt)) || sameCell(startPos, nxt)) {
          return { state: s, outgoing: [] };
        }
        trail.push(pos);
        pos = nxt;
      }
      const me = { ...s.me, pos, trail, energy: s.me.energy - COST.silence, surfaced: false, revealedLine: null };
      const next = endMyTurn({ ...s, me });
      return { state: next, outgoing: [{ t: 'silence' }] };
    }
    case 'torpedo': {
      if (!isMyTurn(s)) return { state: s, outgoing: [] };
      if (s.me.energy < COST.torpedo) return { state: s, outgoing: [] };
      if (!inBounds(a.target) || manhattan(s.me.pos, a.target) > TORPEDO_RANGE) {
        return { state: s, outgoing: [] };
      }
      const nonce = s.nextNonce;
      const me = { ...s.me, energy: s.me.energy - COST.torpedo };
      const next = endMyTurn({ ...s, me, nextNonce: nonce + 1 });
      return { state: next, outgoing: [{ t: 'torpedo', target: a.target, nonce }] };
    }
    case 'sonar': {
      if (!isMyTurn(s)) return { state: s, outgoing: [] };
      if (s.me.energy < COST.sonar) return { state: s, outgoing: [] };
      const nonce = s.nextNonce;
      const me = { ...s.me, energy: s.me.energy - COST.sonar };
      const next = endMyTurn({ ...s, me, nextNonce: nonce + 1 });
      return { state: next, outgoing: [{ t: 'sonar-req', nonce }] };
    }
    case 'sonar-reveal': {
      // Forced answer to an enemy Sonar: give up one TRUE line (row=y or col=x).
      // Not turn-gated — it's a response; the turn already advanced on 'sonar-req'.
      if (s.pendingSonar === null) return { state: s, outgoing: [] };
      const value = a.axis === 'row' ? s.me.pos.y : s.me.pos.x;
      const me = { ...s.me, revealedLine: { axis: a.axis, value } };
      const out: WireMessage = { t: 'sonar-res', nonce: s.pendingSonar, axis: a.axis, value };
      return { state: { ...s, me, pendingSonar: null }, outgoing: [out] };
    }
    case 'resign': {
      if (s.phase === 'over') return { state: s, outgoing: [] };
      return { state: { ...s, phase: 'over', winner: other(s.side) }, outgoing: [{ t: 'resign' }] };
    }
    default:
      return { state: s, outgoing: [] };
  }
}

function endEnemyTurn(s: GameState): GameState {
  let enemyExtraTurns = s.enemyExtraTurns;
  let turn: Side;
  if (enemyExtraTurns > 0) {
    enemyExtraTurns -= 1;
    turn = enemyExtraTurns > 0 ? other(s.side) : s.side;
  } else {
    turn = s.side;
  }
  return { ...s, turn, enemyExtraTurns, turnNumber: s.turnNumber + 1 };
}

export function applyRemote(s: GameState, m: WireMessage): LocalResult {
  // The peer is untrusted. Once the game is over, no incoming frame may mutate state —
  // otherwise a near-simultaneous mutual 'resign' would flip each peer's recorded winner
  // (each would re-declare itself the winner), and stray late frames could rewrite hp.
  if (s.phase === 'over') return { state: s, outgoing: [] };

  // Enemy *actions* are only legal on the enemy's turn. Replies to my own requests
  // ('torpedo-res'/'sonar-res') and the 'placed' handshake are exempt — those can
  // legitimately arrive during my own turn (e.g. a reply to a torpedo I fired on a
  // surface-bonus turn). Drop out-of-turn actions so a buggy/hostile peer can't act
  // when it isn't their turn.
  const isEnemyAction =
    m.t === 'move' || m.t === 'silence' || m.t === 'surface' ||
    m.t === 'torpedo' || m.t === 'sonar-req';
  if (isEnemyAction && !(s.phase === 'playing' && s.turn === other(s.side))) {
    return { state: s, outgoing: [] };
  }

  switch (m.t) {
    case 'placed': {
      const enemyPlaced = true;
      const phase = s.iPlaced && enemyPlaced ? 'playing' as const : s.phase;
      return { state: { ...s, enemyPlaced, phase }, outgoing: [] };
    }
    case 'move': {
      // Enemy moved → they re-submerged: surfaced boat hidden again, and any revealed line is now stale.
      const enemy = { ...s.enemy, surfacedSector: null, surfacedCell: null, revealedLine: null };
      return { state: endEnemyTurn({ ...s, enemy }), outgoing: [] };
    }
    case 'silence': {
      // Silent run also re-submerges them and staleness-clears the revealed line.
      const enemy = { ...s.enemy, surfacedSector: null, surfacedCell: null, revealedLine: null };
      return { state: endEnemyTurn({ ...s, enemy }), outgoing: [] };
    }
    case 'surface': {
      // The enemy surfaced: their exact cell is exposed and I get SURFACE_SKIP consecutive turns.
      const enemy = { ...s.enemy, surfacedSector: m.sector, surfacedCell: m.cell, revealedLine: null };
      const next: GameState = {
        ...s, enemy, myExtraTurns: SURFACE_SKIP, enemyExtraTurns: 0, turn: s.side, turnNumber: s.turnNumber + 1,
      };
      return { state: next, outgoing: [] };
    }
    case 'torpedo': {
      // I am the defender: compute against my secret position.
      const hit = sameCell(m.target, s.me.pos);
      const hp = hit ? s.me.hp - 1 : s.me.hp;
      const me = { ...s.me, hp, alive: hp > 0 };
      const res: WireMessage = {
        t: 'torpedo-res', nonce: m.nonce, hit, hitCell: hit ? m.target : null, defenderHp: hp,
      };
      if (hp <= 0) {
        const next: GameState = { ...s, me, phase: 'over', winner: other(s.side) };
        return { state: next, outgoing: [res] };
      }
      return { state: endEnemyTurn({ ...s, me }), outgoing: [res] };
    }
    case 'torpedo-res': {
      // I am the attacker: update what I know about the enemy.
      const enemy = {
        ...s.enemy,
        hp: m.defenderHp,
        lastHitCell: m.hit ? m.hitCell : s.enemy.lastHitCell,
      };
      let next: GameState = { ...s, enemy };
      if (m.defenderHp <= 0) next = { ...next, phase: 'over', winner: s.side };
      return { state: next, outgoing: [] };
    }
    case 'sonar-req': {
      // I am the defender: I owe a truthful row/col. The turn advances now; the actual
      // reveal is an interactive follow-up ('sonar-reveal') the UI prompts for.
      return { state: { ...endEnemyTurn(s), pendingSonar: m.nonce }, outgoing: [] };
    }
    case 'sonar-res': {
      // I am the attacker: record the enemy's forced true line.
      const enemy = { ...s.enemy, revealedLine: { axis: m.axis, value: m.value } };
      return { state: { ...s, enemy }, outgoing: [] };
    }
    case 'resign': {
      return { state: { ...s, phase: 'over', winner: s.side }, outgoing: [] };
    }
    default:
      return { state: s, outgoing: [] };
  }
}
