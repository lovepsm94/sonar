// Shared fixtures for design-sync preview cards. Builds REAL GameState objects
// via the game's own factories (initState + generateMap), then tweaks fields to
// stage realistic scenarios — so the screens render the way the live app renders
// them. Not a component (underscore-free name, but lives outside previews/), so
// it is never picked up as a card; previews import it via `../fixtures`.
import { initState } from '@/game/engine';
import { generateMap } from '@/game/map';
import type { GameState, GameMap, Cell } from '@/game/types';

export const noop = () => {};

const MAP_SEED = 4242;

function water(map: GameMap): Cell[] {
  const out: Cell[] = [];
  for (let y = 0; y < map.size; y++)
    for (let x = 0; x < map.size; x++) if (!map.islands[y][x]) out.push({ x, y });
  return out;
}

/** Fresh placing-phase state (HP full, nothing deployed). */
export function placingState(): GameState {
  const s = initState(generateMap(MAP_SEED), 'host');
  s.phase = 'placing';
  return s;
}

/** Mid-match state: my sub deployed with a short trail, energy charged, the
 *  enemy down to 1 HP and surfaced — enough to exercise the HUD + board glyphs. */
export function playingState(): GameState {
  const s = initState(generateMap(MAP_SEED), 'host');
  const w = water(s.map);
  const pick = (x: number, y: number): Cell =>
    w.find((c) => c.x === x && c.y === y) ?? w[Math.floor(w.length / 2)];
  s.phase = 'playing';
  s.turn = 'host';
  s.turnNumber = 7;
  s.iPlaced = true;
  s.enemyPlaced = true;
  s.me = {
    pos: pick(4, 5),
    trail: [pick(4, 3), pick(4, 4)],
    hp: 2,
    energy: 3,
    alive: true,
    surfaced: false,
    revealedLine: null,
  };
  s.enemy = {
    hp: 1,
    surfacedSector: 'B',
    surfacedCell: null,
    lastHitCell: pick(7, 2),
    revealedLine: { axis: 'row', value: 3 },
  };
  return s;
}

/** Finished match with a winner. side='host' → I won (this client is host). */
export function overState(winner: 'host' | 'guest' = 'host'): GameState {
  const s = playingState();
  s.phase = 'over';
  s.winner = winner;
  s.me = { ...s.me, hp: winner === 'host' ? 1 : 0, alive: winner === 'host' };
  s.enemy = { ...s.enemy, hp: winner === 'guest' ? 1 : 0 };
  return s;
}

export const sampleLog = [
  { id: 1, who: 'me' as const, vi: 'Bạn di chuyển về Đông', en: 'You moved East' },
  { id: 2, who: 'en' as const, vi: 'Địch dùng Sonar', en: 'Enemy used Sonar' },
  { id: 3, who: 'hit' as const, vi: 'Ngư lôi trúng đích!', en: 'Torpedo hit!' },
  { id: 4, who: 'me' as const, vi: 'Bạn nạp năng lượng', en: 'You charged energy' },
];

export const sampleStats = { turns: 14, hits: 2, sonars: 3 };
