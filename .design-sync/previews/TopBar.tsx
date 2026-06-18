import { TopBar } from 'sonar';

// TopBar positions itself absolutely (top/left/right). Wrap in a relative,
// padded box so the card shows it in place instead of pinned to the corner.
export const Default = () => (
  <div style={{ position: 'relative', height: 60 }}>
    <TopBar />
  </div>
);
