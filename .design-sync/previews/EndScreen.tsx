import { EndScreen } from 'sonar';
import { overState, sampleStats, noop } from '../fixtures';

// Victory: enemy hull destroyed — win glow, rising bubbles, match stats.
export const Win = () => (
  <EndScreen state={overState('host')} stats={sampleStats} onRematch={noop} onHome={noop} />
);

// Defeat: my submarine sunk — sinking debris, muted palette.
export const Lose = () => (
  <EndScreen state={overState('guest')} stats={sampleStats} onRematch={noop} onHome={noop} />
);
