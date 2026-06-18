'use client';
import { SWEEP_CLS } from './ui';

// Re-export SWEEP_CLS so Board.tsx and other callers can import it from a single place.
export { SWEEP_CLS } from './ui';

export function WaitDots() {
  return (
    <span className="font-mono tracking-[.2em]">
      <span style={{ animation: 'pulse 1.2s infinite' }}>•</span>
      <span style={{ animation: 'pulse 1.2s .2s infinite' }}>•</span>
      <span style={{ animation: 'pulse 1.2s .4s infinite' }}>•</span>
    </span>
  );
}

export function MiniRadar({ size = 150 }: { size?: number }) {
  return (
    <div
      className="scope-skin relative rounded-full border border-line overflow-hidden"
      style={{
        width: size,
        height: size,
        background: 'radial-gradient(circle at 50% 50%, var(--scope-2), var(--scope))',
      }}
    >
      {/* opacity-60 overrides the base opacity-50 on the sweep */}
      <div className={SWEEP_CLS.replace('opacity-50', 'opacity-60')} />
      <svg
        viewBox="0 0 100 100"
        width="100%"
        height="100%"
        style={{ position: 'relative', zIndex: 5 }}
      >
        <g stroke="var(--grid)" strokeWidth="0.6" fill="none">
          <circle cx="50" cy="50" r="46" />
          <circle cx="50" cy="50" r="31" />
          <circle cx="50" cy="50" r="16" />
          <line x1="4" y1="50" x2="96" y2="50" />
          <line x1="50" y1="4" x2="50" y2="96" />
        </g>
        <circle cx="66" cy="38" r="2.4" fill="var(--enemy)">
          <animate attributeName="opacity" values="1;.2;1" dur="2.4s" repeatCount="indefinite" />
        </circle>
        <circle cx="40" cy="62" r="2.4" fill="var(--accent)" />
      </svg>
    </div>
  );
}
