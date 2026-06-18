// Design-sync bundle entry (barrel). Sonar is a Next.js app with no library
// build, so this hand-written entry re-exports exactly the UI components we sync
// to claude.ai/design. esbuild bundles it (with the @/ tsconfig alias) into the
// importable window.Sonar global. Not part of the app — a design-sync input only.
export { WaitDots, MiniRadar } from '@/app/screens/bits';
export { TopBar } from '@/app/TopBar';
export { Board } from '@/app/board/Board';
export { HomeScreen } from '@/app/screens/HomeScreen';
export { ConnectScreen } from '@/app/screens/ConnectScreen';
export { PlaceScreen } from '@/app/screens/PlaceScreen';
export { PlayScreen } from '@/app/screens/PlayScreen';
export { EndScreen } from '@/app/screens/EndScreen';
export { NoticeScreen } from '@/app/screens/NoticeScreen';
// ScanModal is intentionally NOT synced: it mounts a live camera (QR scanner)
// on render and cannot be previewed statically. See .design-sync/NOTES.md.
