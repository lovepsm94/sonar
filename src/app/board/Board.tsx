'use client';
import { useEffect, useRef, useState } from 'react';
import { type Cell, type GameState, type SectorId } from '@/game/types';
import { sameCell } from '@/game/geo';
import { SWEEP_CLS, SUB_TOKEN } from '../screens/ui';
import type { RadioView } from '../useRadioOperator';

// ── Geometry constants ────────────────────────────────────────
const CELL = 32;
const PAD = 18; // outer gutter — also holds the A–J / 1–10 coordinate labels
const BSIZE = CELL * 10 + PAD * 2; // 356
const cx = (n: number): number => PAD + n * CELL + CELL / 2;

// ── Fx type (exported — page.tsx depends on this shape) ───────
export type Fx =
  | { id: number; type: 'torpedo';  from: Cell; to: Cell; hit: boolean }
  | { id: number; type: 'impact';   at: Cell; hit: boolean }
  | { id: number; type: 'ping';     at: Cell }
  | { id: number; type: 'silence';  from: Cell; to: Cell }
  | { id: number; type: 'surface';  at: Cell };

// ── SubGlyph subcomponent ─────────────────────────────────────
interface SubGlyphProps { color: string; dim?: boolean; }
function SubGlyph({ color, dim = false }: SubGlyphProps) {
  return (
    <g opacity={dim ? 0.5 : 1}>
      <ellipse rx="11" ry="6.5" fill={color} opacity="0.18" />
      <ellipse rx="8.5" ry="4.6" fill="none" stroke={color} strokeWidth="1.6" />
      <rect x="-2.4" y="-7.6" width="4.8" height="4.4" rx="1.4" fill={color} />
      <circle r="1.7" fill={color} />
      <circle r="1.7" fill={color}>
        <animate attributeName="opacity" values="1;.3;1" dur="2s" repeatCount="indefinite" />
      </circle>
    </g>
  );
}

// ── SurfacedBoat subcomponent ─────────────────────────────────
// The exposed boat sitting on the surface: gold halo + waterline + the sub glyph
// tinted by side (accent = me, enemy = opponent). Sized to fit within a single cell.
function SurfacedBoat({ color }: { color: string }) {
  return (
    <>
      {/* Persistent gold "surfaced" halo */}
      <circle r="12" fill="none" stroke="var(--gold)" strokeWidth="0.9" opacity="0.55">
        <animate attributeName="opacity" values=".3;.7;.3" dur="2.4s" repeatCount="indefinite" />
      </circle>
      <circle
        r="9"
        fill={`color-mix(in srgb, ${color} 18%, transparent)`}
        stroke={color}
        strokeWidth="1.2"
      />
      {/* Waterline dashes = sitting on the surface */}
      <g stroke="var(--gold)" strokeWidth="1" opacity="0.8" strokeLinecap="round">
        <line x1="-11" y1="3" x2="-7" y2="3" />
        <line x1="7" y1="3" x2="11" y2="3" />
      </g>
      <SubGlyph color={color} />
      <circle r="1.6" fill="var(--gold)" cy="-7">
        <animate attributeName="opacity" values="1;.3;1" dur="0.9s" repeatCount="indefinite" />
      </circle>
    </>
  );
}

// ── Explosion subcomponent ────────────────────────────────────
// Torpedo detonation. Miss = water-splash plume (gold/cyan); hit = full kill
// blast (scorch flare, triple shockwave, heavy shrapnel, fireball + white core,
// delayed secondary). Ported from the design prototype (design/board.jsx).
// `delay` offsets every sub-animation so it can fire after the projectile lands.
function Explosion({ hit, delay = 0 }: { hit: boolean; delay?: number }) {
  const col = hit ? 'var(--danger)' : 'var(--gold)';
  const d = (s: number) => `${delay + s}s`;

  if (!hit) {
    // MISS — torpedo detonates in empty water: a splash plume + modest shockwave.
    const drops: { sx: number; sy: number; w: number }[] = [];
    const M = 7;
    for (let i = 0; i < M; i++) {
      const ang = -Math.PI / 2 + (i - (M - 1) / 2) * 0.42; // fan upward
      const dist = 13 + (i % 3) * 5;
      drops.push({ sx: Math.cos(ang) * dist, sy: Math.sin(ang) * dist - 4, w: i % 2 ? 1.8 : 2.6 });
    }
    return (
      <g>
        <circle r="2" fill="var(--enemy)" opacity="0.22"
          style={{ animation: `fx-smoke .85s ease-out ${d(0.02)} forwards`, transformOrigin: 'center' }} />
        <circle r="3" fill="none" stroke={col} strokeWidth="2.5"
          style={{ animation: `fx-shock .55s ease-out ${d(0)} forwards`, transformOrigin: 'center' }} />
        {drops.map((s, i) => (
          <circle key={i} r={s.w} fill={i % 2 ? 'var(--enemy)' : col}
            style={{ '--sx': `${s.sx}px`, '--sy': `${s.sy}px`,
              animation: `fx-splash .6s cubic-bezier(.3,.6,.5,1) ${d(0.02)} forwards`,
              transformBox: 'fill-box', transformOrigin: 'center' } as React.CSSProperties} />
        ))}
        <circle r="2" fill={col} opacity="0.8"
          style={{ animation: `fx-fireball .4s ease-out ${d(0)} forwards`, transformOrigin: 'center' }} />
      </g>
    );
  }

  // HIT — full kill blast: scorch flare, triple shockwave, heavy shrapnel, secondary blast.
  const shards: { sx: number; sy: number; w: number }[] = [];
  const N = 13;
  for (let i = 0; i < N; i++) {
    const ang = (i / N) * Math.PI * 2 + (i % 2) * 0.3;
    const dist = 18 + (i % 4) * 7;
    shards.push({ sx: Math.cos(ang) * dist, sy: Math.sin(ang) * dist, w: i % 2 ? 2.6 : 3.8 });
  }
  return (
    <g>
      {/* lingering scorch glow */}
      <circle r="20" fill="var(--danger)" opacity="0"
        style={{ animation: `fx-scorch 1.1s ease-out ${d(0)} forwards`, transformOrigin: 'center', filter: 'blur(3px)' }} />
      {/* big ring flash */}
      <circle r="4" fill="none" stroke="#fff" strokeWidth="6"
        style={{ animation: `fx-ringflash .55s ease-out ${d(0)} forwards`, transformOrigin: 'center' }} />
      {/* triple shockwave */}
      <circle r="3" fill="none" stroke={col} strokeWidth="3.5"
        style={{ animation: `fx-shock .6s ease-out ${d(0)} forwards`, transformOrigin: 'center' }} />
      <circle r="3" fill="none" stroke="var(--gold)" strokeWidth="2.4"
        style={{ animation: `fx-shock .75s ease-out ${d(0.12)} forwards`, transformOrigin: 'center' }} />
      <circle r="3" fill="none" stroke={col} strokeWidth="1.6"
        style={{ animation: `fx-shock .85s ease-out ${d(0.26)} forwards`, transformOrigin: 'center' }} />
      {/* heavy shrapnel */}
      {shards.map((s, i) => (
        <line key={i} x1="0" y1="0" x2={s.sx * 0.2} y2={s.sy * 0.2}
          stroke={i % 3 ? col : 'var(--gold)'} strokeWidth={s.w} strokeLinecap="round"
          style={{ '--sx': `${s.sx}px`, '--sy': `${s.sy}px`,
            animation: `fx-shard .6s ease-out ${d(0.02)} forwards`, transformBox: 'fill-box', transformOrigin: '0 0' } as React.CSSProperties} />
      ))}
      {/* fireball + hot white core */}
      <circle r="2" fill={col} opacity="0.9"
        style={{ animation: `fx-fireball .55s ease-out ${d(0)} forwards`, transformOrigin: 'center', filter: `drop-shadow(0 0 9px ${col})` }} />
      <circle r="1" fill="#fff"
        style={{ animation: `fx-core .5s ease-out ${d(0)} forwards`, transformOrigin: 'center' }} />
      {/* secondary delayed blast */}
      <circle r="1" fill="var(--gold)"
        style={{ animation: `fx-fireball .45s ease-out ${d(0.3)} forwards`, transformOrigin: 'center' }} />
      <circle r="2" fill="none" stroke="#fff" strokeWidth="2.5"
        style={{ animation: `fx-burst .4s ease-out ${d(0.32)} forwards`, transformOrigin: 'center' }} />
    </g>
  );
}

// ── Board props ───────────────────────────────────────────────
interface BoardProps {
  state: GameState;
  mode?: 'idle' | 'place' | 'torpedo' | 'plot';
  highlight?: Cell[];
  onCellClick?: (c: Cell) => void;
  effects?: Fx[];
  onEffectDone?: (id: number) => void;
  revealSectors?: SectorId[];
  selected?: Cell | null;
  plot?: RadioView | null;          // Radio Operator view-model when mode === 'plot'
  onPlotCell?: (c: Cell) => void;   // tap a plot cell (pin hypothesis / pick silence-fan cell)
}

export function Board({
  state,
  mode = 'idle',
  highlight = [],
  onCellClick,
  effects = [],
  onEffectDone,
  revealSectors = [],
  selected = null,
  plot = null,
  onPlotCell,
}: BoardProps) {
  const { map, me, enemy } = state;

  // Size the (square) board to fit its container in BOTH dimensions, so on short
  // viewports it shrinks to the available height instead of pushing the HUD off-screen.
  const boxRef = useRef<HTMLDivElement>(null);
  const [side, setSide] = useState(320);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => {
      const s = Math.min(el.clientWidth, el.clientHeight);
      if (s > 0) setSide(Math.min(s, 640));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // FX cleanup timers
  useEffect(() => {
    const timers = effects.map((fx) => {
      const dur =
        fx.type === 'torpedo' ? 2000  // projectile (.7s) + full detonation
        : fx.type === 'impact'  ? 1300
        : fx.type === 'surface' ? 1400
        : fx.type === 'ping'    ? 1300
        : 1000;
      return setTimeout(() => onEffectDone && onEffectDone(fx.id), dur);
    });
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effects.map((e) => e.id).join(',')]);

  const cells: Cell[] = [];
  for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) cells.push({ x, y });

  const isHi = (c: Cell) => highlight.some((h) => sameCell(h, c));
  const isPlot = mode === 'plot';
  const selectable = mode === 'place' || mode === 'torpedo';
  const hiColor = mode === 'place' ? 'var(--accent)' : 'var(--danger)';
  const hiWash = mode === 'place' ? 11 : 26;

  // Build polyline points string from an array of cells
  const polyPts = (pts: Cell[]) => pts.map((p) => `${cx(p.x)},${cx(p.y)}`).join(' ');

  return (
    <div ref={boxRef} className="w-full h-full min-h-0 flex items-center justify-center">
    <div
      className="scope-skin relative shrink-0 rounded-box overflow-hidden border border-line"
      style={{
        width: side,
        height: side,
        background: 'radial-gradient(120% 120% at 50% 42%, var(--scope-2), var(--scope))',
        boxShadow: '0 18px 50px -22px #000, inset 0 0 60px rgba(0,0,0,.45)',
      }}
    >
      {/* Radar sweep — hidden during placement */}
      {mode !== 'place' && <div className={SWEEP_CLS} />}

      <svg
        viewBox={`0 0 ${BSIZE} ${BSIZE}`}
        width="100%"
        height="100%"
        role="img"
        aria-label="sonar board"
        style={{ position: 'relative', zIndex: 5, display: 'block', touchAction: 'manipulation' }}
      >
        <defs>
          <radialGradient id="scopeGlow" cx="50%" cy="44%" r="60%">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.06" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </radialGradient>
          <filter id="soft">
            <feGaussianBlur stdDeviation="0.6" />
          </filter>
        </defs>

        <rect x={PAD} y={PAD} width={CELL * 10} height={CELL * 10} fill="url(#scopeGlow)" />

        {/* Sector reveal tint (e.g. after enemy surfaces) */}
        {revealSectors.map((sec) => {
          const left = sec === 'A' || sec === 'C';
          const top  = sec === 'A' || sec === 'B';
          return (
            <rect
              key={sec}
              x={PAD + (left ? 0 : CELL * 5)}
              y={PAD + (top  ? 0 : CELL * 5)}
              width={CELL * 5}
              height={CELL * 5}
              fill="var(--enemy)"
              opacity="0.1"
            />
          );
        })}

        {/* Cells */}
        {cells.map((c) => {
          const island = map.islands[c.y][c.x];
          const hi = isHi(c);
          return (
            <g key={`${c.x},${c.y}`}>
              <rect
                x={PAD + c.x * CELL + 1.2}
                y={PAD + c.y * CELL + 1.2}
                width={CELL - 2.4}
                height={CELL - 2.4}
                rx={4}
                fill={
                  island
                    ? 'var(--island)'
                    : hi
                    ? `color-mix(in srgb, ${hiColor} ${hiWash}%, transparent)`
                    : 'transparent'
                }
                stroke={
                  island
                    ? 'var(--island-2)'
                    : hi && mode === 'place'
                    ? 'color-mix(in srgb, var(--accent) 30%, transparent)'
                    : 'var(--grid-soft)'
                }
                strokeWidth={1}
                style={{
                  cursor: (selectable || isPlot) && !island ? 'crosshair' : 'default',
                  transition: 'fill .25s',
                }}
                onClick={() => {
                  if (island) return;
                  if (isPlot) onPlotCell && onPlotCell(c);
                  else if (selectable) onCellClick && onCellClick(c);
                }}
              />
              {island && (
                <circle cx={cx(c.x)} cy={cx(c.y)} r="3.4" fill="var(--island-2)" />
              )}
              {hi && !island && mode === 'torpedo' && (
                <circle cx={cx(c.x)} cy={cx(c.y)} r="3" fill="var(--danger)" opacity="0.9"
                  style={{ pointerEvents: 'none' }}>
                  <animate attributeName="opacity" values=".4;1;.4" dur="1.3s" repeatCount="indefinite" />
                </circle>
              )}
            </g>
          );
        })}

        {/* Grid lines */}
        <g stroke="var(--grid)" strokeWidth="0.6">
          {Array.from({ length: 11 }, (_, i) => (
            <g key={i}>
              <line
                x1={PAD + i * CELL} y1={PAD}
                x2={PAD + i * CELL} y2={PAD + CELL * 10}
                opacity={i % 5 ? 0.5 : 0}
              />
              <line
                x1={PAD} y1={PAD + i * CELL}
                x2={PAD + CELL * 10} y2={PAD + i * CELL}
                opacity={i % 5 ? 0.5 : 0}
              />
            </g>
          ))}
        </g>

        {/* Sector dividers (bold) */}
        <g stroke="var(--sector-ln)" strokeWidth="1.4">
          <line x1={PAD + CELL * 5} y1={PAD} x2={PAD + CELL * 5} y2={PAD + CELL * 10} />
          <line x1={PAD} y1={PAD + CELL * 5} x2={PAD + CELL * 10} y2={PAD + CELL * 5} />
        </g>

        {/* Coordinate labels — columns A–J (top) and rows 1–10 (left) */}
        <g
          style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600, fill: 'var(--muted)' }}
          textAnchor="middle"
          opacity="0.7"
        >
          {Array.from({ length: 10 }, (_, i) => (
            <text key={`col${i}`} x={cx(i)} y={PAD / 2} dominantBaseline="middle">
              {String.fromCharCode(65 + i)}
            </text>
          ))}
          {Array.from({ length: 10 }, (_, i) => (
            <text key={`row${i}`} x={PAD / 2} y={cx(i)} dominantBaseline="middle">
              {i + 1}
            </text>
          ))}
        </g>

        {/* Sonar reveal bands: the enemy's forced true line (enemy tint) and my own
            leaked line (gold). Both show in the plot too — it mirrors the battle board. */}
        {([
          { rl: enemy.revealedLine, color: 'var(--enemy)' },
          { rl: me.revealedLine, color: 'var(--gold)' },
        ] as const).map(({ rl, color }, k) => {
          if (!rl) return null;
          const isRow = rl.axis === 'row';
          const x = isRow ? PAD : PAD + rl.value * CELL;
          const y = isRow ? PAD + rl.value * CELL : PAD;
          const w = isRow ? CELL * 10 : CELL;
          const h = isRow ? CELL : CELL * 10;
          return (
            <g key={`rl${k}`} style={{ pointerEvents: 'none' }}>
              <rect x={x + 1} y={y + 1} width={w - 2} height={h - 2} rx={4} fill={color} opacity={0.16} />
              <rect x={x + 1} y={y + 1} width={w - 2} height={h - 2} rx={4} fill="none"
                stroke={color} strokeWidth={1.4} strokeDasharray="5 4" opacity={0.7}>
                <animate attributeName="stroke-dashoffset" from="18" to="0" dur="1.2s" repeatCount="indefinite" />
              </rect>
            </g>
          );
        })}

        {/* Radio Operator plot: possible cells + silence fan + pinned hypothesis.
            Everything else (my sub/trail, enemy markers) is rendered exactly like the
            battle board below — the plot only ADDS the possible cells + click-to-pin. */}
        {isPlot && plot && (
          <g>
            {plot.cells.map((c) => (
              <rect key={`po${c.x},${c.y}`} x={PAD + c.x * CELL + 2.5} y={PAD + c.y * CELL + 2.5}
                width={CELL - 5} height={CELL - 5} rx={5} fill="var(--enemy)" opacity={0.16}
                stroke="var(--enemy)" strokeWidth={0.8} strokeOpacity={0.4} style={{ pointerEvents: 'none' }} />
            ))}
            {plot.fan && plot.fan.map((o, i) => (
              <rect key={`fan${i}`} x={PAD + o.cell.x * CELL + 3} y={PAD + o.cell.y * CELL + 3}
                width={CELL - 6} height={CELL - 6} rx={6} fill="var(--gold)" opacity={0.18}
                stroke="var(--gold)" strokeWidth={1.3} strokeDasharray="3 3" style={{ cursor: 'pointer' }}
                onClick={() => onPlotCell && onPlotCell(o.cell)}>
                <animate attributeName="opacity" values=".12;.3;.12" dur="1.6s" repeatCount="indefinite" />
              </rect>
            ))}
            {plot.pinned && !plot.pinned.fanning && (
              <g style={{ pointerEvents: 'none' }}>
                {plot.pinned.trail.length > 1 && (
                  <polyline points={polyPts(plot.pinned.trail)} fill="none" stroke="var(--danger)"
                    strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 5" opacity={0.85} />
                )}
                {plot.pinned.trail.map((p, i) => (
                  <circle key={`pt${i}`} cx={cx(p.x)} cy={cx(p.y)} r={2.4}
                    fill="var(--scope)" stroke="var(--danger)" strokeWidth={1.2} opacity={0.7} />
                ))}
                <g transform={`translate(${cx(plot.pinned.trail[0].x)},${cx(plot.pinned.trail[0].y)})`}>
                  <circle r={6.5} fill="none" stroke="var(--gold)" strokeWidth={1.6} strokeDasharray="3 2" />
                  <circle r={2} fill="var(--gold)" />
                </g>
                <g transform={`translate(${cx(plot.pinned.pos.x)},${cx(plot.pinned.pos.y)})`}>
                  <circle r={11} fill="none" stroke="var(--danger)" strokeWidth={1.5}>
                    <animate attributeName="r" values="9;14;9" dur="1.8s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values=".9;.2;.9" dur="1.8s" repeatCount="indefinite" />
                  </circle>
                  <path d="M0 -8 L8 0 L0 8 L-8 0 Z" fill="color-mix(in srgb, var(--danger) 30%, transparent)"
                    stroke="var(--danger)" strokeWidth={1.6} />
                </g>
              </g>
            )}
          </g>
        )}

        {/* My trail — three-layer: glow underlay + animated dashed line + breadcrumbs + start marker.
            The "settled" lines stop at the last breadcrumb; the final hop (breadcrumb -> sub) is
            drawn by a separate segment that reveals in sync with the sub's glide, so the line never
            races ahead of the boat. */}
        {me.trail.length > 0 && (
          <g style={{ pointerEvents: 'none' }}>
            {/* Soft glow underlay (settled hops) */}
            <polyline
              points={polyPts(me.trail)}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.12"
            />
            {/* Main animated dashed path (settled hops) */}
            <polyline
              points={polyPts(me.trail)}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.6"
              strokeDasharray="0.5 5"
            >
              <animate attributeName="stroke-dashoffset" from="11" to="0" dur="0.9s" repeatCount="indefinite" />
            </polyline>
            {/* Final hop: breadcrumb -> sub. Rendered with the SAME glow + dotted style as the
                settled hops (so it doesn't read as a solid line), but its endpoint animates in
                lock-step with the sub's glide so the line follows the boat instead of racing ahead.
                Keyed by hop count so the draw replays on every move. */}
            {(() => {
              const b = me.trail[me.trail.length - 1];
              const bx = cx(b.x), by = cx(b.y);
              const px = cx(me.pos.x), py = cx(me.pos.y);
              // Endpoint draw-in, matched to the sub glide (SUB_TOKEN: .55s cubic-bezier(.34,.8,.3,1)).
              const drawTo = (attr: 'x2' | 'y2', from: number, to: number) => (
                <animate attributeName={attr} from={String(from)} to={String(to)} dur="0.55s"
                  calcMode="spline" keyTimes="0;1" keySplines="0.34 0.8 0.3 1" fill="freeze" />
              );
              return (
                // The static x2/y2 start COLLAPSED at the breadcrumb so the line is never
                // drawn past the boat before the animation runs; the SMIL then grows the
                // endpoint to the sub in lock-step with its glide. It always ends at the hull.
                <g key={`head-${me.trail.length}`}>
                  {/* Glow underlay (solid, like the settled glow) */}
                  <line x1={bx} y1={by} x2={bx} y2={by}
                    stroke="var(--accent)" strokeWidth="5" strokeLinecap="round" opacity="0.12">
                    {drawTo('x2', bx, px)}{drawTo('y2', by, py)}
                  </line>
                  {/* Dotted main line (matches the settled animated dashed path) */}
                  <line x1={bx} y1={by} x2={bx} y2={by}
                    stroke="var(--accent)" strokeWidth="2" strokeLinecap="round"
                    opacity="0.6" strokeDasharray="0.5 5">
                    <animate attributeName="stroke-dashoffset" from="11" to="0" dur="0.9s" repeatCount="indefinite" />
                    {drawTo('x2', bx, px)}{drawTo('y2', by, py)}
                  </line>
                </g>
              );
            })()}
            {/* Breadcrumb nodes, fading toward the start */}
            {me.trail.map((t, i) => {
              const f = (i + 1) / (me.trail.length + 1);
              return (
                <circle
                  key={`tr${i}`}
                  cx={cx(t.x)}
                  cy={cx(t.y)}
                  r="3"
                  fill="var(--scope)"
                  stroke="var(--accent)"
                  strokeWidth="1.4"
                  opacity={0.35 + 0.45 * f}
                />
              );
            })}
            {/* Dashed start marker */}
            <g transform={`translate(${cx(me.trail[0].x)},${cx(me.trail[0].y)})`} opacity="0.7">
              <circle r="4.5" fill="none" stroke="var(--accent)" strokeWidth="1" strokeDasharray="2 2" />
            </g>
          </g>
        )}

        {/* Enemy hit marker (from EnemyView.lastHitCell — no pos/contact in real model) */}
        {enemy.lastHitCell && (
          <g transform={`translate(${cx(enemy.lastHitCell.x)},${cx(enemy.lastHitCell.y)})`} style={{ pointerEvents: 'none' }}>
            <circle r="11" fill="none" stroke="var(--danger)" strokeWidth="1.6" opacity="0.9" />
            <path d="M-4 -4 L4 4 M4 -4 L-4 4" stroke="var(--danger)" strokeWidth="1.6" />
          </g>
        )}

        {/* Enemy surfaced boat — exact position revealed while the enemy sits exposed.
            pointer-events:none so it doesn't block torpedoing the very cell it sits on. */}
        {enemy.surfacedCell && mode !== 'place' && (
          <g style={{ transform: `translate(${cx(enemy.surfacedCell.x)}px,${cx(enemy.surfacedCell.y)}px)`, pointerEvents: 'none' }}>
            <g
              className="animate-sub-surface"
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            >
              <SurfacedBoat color="var(--enemy)" />
            </g>
          </g>
        )}

        {/* Placement marker — shown when selected cell is set in place mode */}
        {selected && mode === 'place' && (
          <g transform={`translate(${cx(selected.x)},${cx(selected.y)})`} style={{ pointerEvents: 'none' }}>
            <rect
              x="-15" y="-15" width="30" height="30" rx="5"
              fill="color-mix(in srgb, var(--accent) 20%, transparent)"
              stroke="var(--accent)"
              strokeWidth="1.6"
            />
            <circle r="11" fill="none" stroke="var(--accent)" strokeWidth="1">
              <animate attributeName="r" values="9;14;9" dur="1.8s" repeatCount="indefinite" />
              <animate attributeName="opacity" values=".8;0;.8" dur="1.8s" repeatCount="indefinite" />
            </circle>
            <SubGlyph color="var(--accent)" />
            {/* Corner ticks */}
            <g stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round">
              <path d="M-13 -9 v-4 h4 M13 -9 v-4 h-4 M-13 9 v4 h4 M13 9 v4 h-4" fill="none" />
            </g>
          </g>
        )}

        {/* My sub — submerged reticle while diving, full boat once surfaced.
            Hidden during placement: the player hasn't dived yet, so the placement
            marker (above) is the only thing that should show. */}
        {me.pos && mode !== 'place' && (
          <g
            className={SUB_TOKEN}
            style={{ transform: `translate(${cx(me.pos.x)}px,${cx(me.pos.y)}px)`, pointerEvents: 'none' }}
          >
            {me.surfaced ? (
              // Surfaced boat — scales up with a one-shot pop on mount (animate-sub-surface
              // ends at scale 1.5 and holds it), then sits exposed with a gold halo/waterline.
              <g
                className="animate-sub-surface"
                style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
              >
                <SurfacedBoat color="var(--accent)" />
              </g>
            ) : (
              <>
                {/* Outer pulsing ring */}
                <circle r="10" fill="none" stroke="var(--accent)" strokeWidth="0.9" opacity="0.3">
                  <animate attributeName="r" values="7;13;7" dur="2.6s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values=".4;0;.4" dur="2.6s" repeatCount="indefinite" />
                </circle>
                {/* Solid reticle ring */}
                <circle
                  r="7"
                  fill="color-mix(in srgb, var(--accent) 14%, transparent)"
                  stroke="var(--accent)"
                  strokeWidth="1.4"
                />
                {/* 4 crosshair tick lines */}
                <g stroke="var(--accent)" strokeWidth="1.1" opacity="0.85">
                  <line x1="-10" y1="0" x2="-7.5" y2="0" />
                  <line x1="7.5" y1="0" x2="10" y2="0" />
                  <line x1="0" y1="-10" x2="0" y2="-7.5" />
                  <line x1="0" y1="7.5" x2="0" y2="10" />
                </g>
                {/* Blinking center dot */}
                <circle r="2.4" fill="var(--accent)">
                  <animate attributeName="opacity" values="1;.4;1" dur="1.6s" repeatCount="indefinite" />
                </circle>
              </>
            )}
          </g>
        )}

        {/* FX layer — purely decorative, must never intercept board clicks */}
        <g style={{ pointerEvents: 'none' }}>
        {effects.map((fx) => {
          if (fx.type === 'torpedo') {
            const path = `M ${cx(fx.from.x)} ${cx(fx.from.y)} L ${cx(fx.to.x)} ${cx(fx.to.y)}`;
            const col = fx.hit ? 'var(--danger)' : 'var(--gold)';
            return (
              <g key={fx.id}>
                <line
                  x1={cx(fx.from.x)} y1={cx(fx.from.y)}
                  x2={cx(fx.to.x)}   y2={cx(fx.to.y)}
                  stroke={col} strokeWidth="1" strokeDasharray="2 4" opacity="0.5"
                />
                <circle
                  r="3"
                  fill={col}
                  style={{
                    offsetPath: `path('${path}')`,
                    animation: 'fx-torp .7s cubic-bezier(.4,0,.7,1) forwards',
                  }}
                >
                  <animate attributeName="opacity" values="0;1;1" dur=".7s" fill="freeze" />
                </circle>
                {/* Detonation at the target, timed to land as the projectile arrives. */}
                <g transform={`translate(${cx(fx.to.x)},${cx(fx.to.y)})`}>
                  <Explosion hit={fx.hit} delay={0.68} />
                </g>
              </g>
            );
          }

          if (fx.type === 'impact') {
            // Incoming torpedo landing on us — same blast, no projectile lead-in.
            return (
              <g key={fx.id} transform={`translate(${cx(fx.at.x)},${cx(fx.at.y)})`}>
                <Explosion hit={fx.hit} delay={0} />
              </g>
            );
          }

          if (fx.type === 'ping') {
            // 3 staggered expanding rings
            return (
              <g key={fx.id}>
                {([0, 0.18, 0.36] as const).map((d, k) => (
                  <circle
                    key={k}
                    cx={cx(fx.at.x)}
                    cy={cx(fx.at.y)}
                    r="2"
                    fill="none"
                    stroke="var(--accent)"
                    style={{ animation: `fx-ping 1.1s ease-out ${d}s forwards` }}
                  />
                ))}
              </g>
            );
          }

          if (fx.type === 'silence') {
            // Glowing dash streak from→to + a small ping at the destination
            return (
              <g key={fx.id}>
                <line
                  x1={cx(fx.from.x)} y1={cx(fx.from.y)}
                  x2={cx(fx.to.x)}   y2={cx(fx.to.y)}
                  stroke="var(--accent)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray="60"
                  opacity="0"
                  style={{
                    animation: 'fx-silence .9s ease-out forwards',
                    filter: 'drop-shadow(0 0 5px var(--accent))',
                  }}
                />
                <circle
                  cx={cx(fx.to.x)}
                  cy={cx(fx.to.y)}
                  r="2"
                  fill="none"
                  stroke="var(--accent)"
                  style={{ animation: 'fx-ping .9s ease-out .15s forwards' }}
                />
              </g>
            );
          }

          if (fx.type === 'surface') {
            // 3 gold expanding rings + 4 bubble circles rising
            const bx = cx(fx.at.x);
            const by = cx(fx.at.y);
            return (
              <g key={fx.id}>
                {([0, 0.2, 0.4] as const).map((d, k) => (
                  <circle
                    key={k}
                    cx={bx} cy={by} r="4"
                    fill="none"
                    stroke="var(--gold)"
                    style={{ animation: `fx-surf-ring 1.2s ease-out ${d}s forwards` }}
                  />
                ))}
                {([-7, -2, 3, 8] as const).map((dx, k) => (
                  <circle
                    key={`b${k}`}
                    cx={bx + dx} cy={by}
                    r={1.3 + (k % 2)}
                    fill="var(--accent)"
                    style={{
                      animation: `fx-bubble 1.3s ease-out ${0.05 * k}s forwards`,
                      transformBox: 'fill-box',
                      transformOrigin: 'center',
                    }}
                  />
                ))}
              </g>
            );
          }

          return null;
        })}
        </g>
      </svg>

      {/* coordinate rail placeholder (pointer-events off) */}
      <div className="absolute inset-0 pointer-events-none z-[6]" />
    </div>
    </div>
  );
}
