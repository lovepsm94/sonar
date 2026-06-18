# Sonar

Two-player turn-based submarine duel (simplified Captain Sonar). Peer-to-peer over WebRTC,
QR/link handshake, no backend. See `docs/superpowers/specs/2026-06-16-sonar-game-design.md`.

## Develop
- `npm install`
- `npm run dev` → http://localhost:3000
- `npm test` → unit tests (game logic, map, signaling, i18n)

## Build (static)
- `npm run build` → static site in `out/`. Host anywhere (GitHub Pages, Netlify).

## Play
1. Player A: **Create room** → show QR / share link.
2. Player B: scan QR or open link → answer QR appears automatically.
3. Player A: scan B's answer QR → connected.

## Limits
- Same-WiFi always works; cross-network uses public STUN. Symmetric NAT (needs TURN) is unsupported.
- Anti-cheat is "no manual entry of results"; modifying client code can still cheat.
