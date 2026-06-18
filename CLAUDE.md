# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Sonar — a two-player, turn-based submarine duel (simplified *Captain Sonar*). Pure client-side static site, **no backend**: the two players connect peer-to-peer over WebRTC, handshaking via QR code or a shared link. See `docs/superpowers/specs/2026-06-16-sonar-game-design.md` for the full design (in Vietnamese). Note the spec predates some balance tuning — `src/game/types.ts` is the source of truth for current constants (e.g. `START_HP`, `MAX_ENERGY`, costs).

## Commands

- `npm run dev` — dev server at http://localhost:3000
- `npm run build` — static export to `out/` (host anywhere; `next.config.mjs` sets `output: 'export'`)
- `npm test` — run unit tests once (Vitest)
- `npm run test:watch` — watch mode
- Run a single test file: `npx vitest run test/game/engine.test.ts`
- Run tests matching a name: `npx vitest run -t "torpedo"`

There is no lint script; type-checking happens via `tsc` during `next build` (strict mode). Path alias `@/*` → `./src/*`.

## Architecture

Three strictly-layered concerns. Keep the boundaries: `game/` never imports from `net/` or `app/`; `net/` never imports from `app/`.

### `src/game/` — pure game logic (no UI, no network, no I/O)
The most heavily tested layer. All functions are pure and deterministic.
- `types.ts` — all game constants and types. The single source of truth for balance values.
- `rng.ts` / `geo.ts` — seeded PRNG (mulberry32) and grid math (steps, sectors, distances).
- `map.ts` — `generateMap(seed)` builds a deterministic 10×10 island map with constraint checks (min island gap, per-sector caps, flood-fill water connectivity); retries with derived seeds until valid.
- `protocol.ts` — defines **two distinct message types**, do not conflate them:
  - `LocalAction` — what the local UI dispatches for *this* player (place/move/silence/sonar/torpedo/surface/resign).
  - `WireMessage` — what is actually sent across the DataChannel between peers.
- `engine.ts` — the core reducer, two entry points:
  - `applyLocal(state, action)` → `{ state, outgoing }`: applies *this* player's action, returns the new state plus `WireMessage`s to send to the peer.
  - `applyRemote(state, wireMessage, rng)` → `{ state, outgoing }`: applies a message received *from* the peer, possibly producing reply messages.

### `src/net/` — peer connection
- `webrtc.ts` — `PeerLink` class wrapping `RTCPeerConnection` + `RTCDataChannel`. Uses **non-trickle ICE** (waits for full ICE gathering before producing the SDP, ~1–2s) and public Google STUN. Handshake: host `createOffer()` → guest `acceptOfferCreateAnswer(offer)` → host `acceptAnswer(answer)`.
- `signaling.ts` — encode/decode the SDP+seed payload: JSON → deflate (pako) → base64url. Kept small enough to fit one QR; carried in the URL `#fragment` so nothing touches a server.
- `qr.ts` — QR generation/scanning.

### `src/app/` — Next.js app (UI, the glue)
- `page.tsx` — the orchestrator. Owns the **UI state machine** (`home → host-wait/guest-wait → placing → playing → over`), drives the WebRTC handshake (create room / join from offer / scan answer), and maintains a **presentation layer (FX, log, stats, screen shake) that is deliberately separate from `GameState`**. Game logic lives in the engine; this file only animates/narrates the results.
- `useGame.ts` — the hook bridging `PeerLink` ↔ engine. `dispatch` runs `applyLocal` and sends outgoing messages; the peer's `onMessage` runs `applyRemote` and sends its replies. `reset` is used for rematch on the same connection.
- `screens/`, `board/` — rendered purely from `GameState` via SVG + Framer Motion. The board holds no game state of its own.
- `i18n/` — bilingual VI/EN via react-i18next. Language is a **local per-device choice** (localStorage, defaults from `navigator.language` with `vi` fallback) and is *not* synced across the connection — the two players may see different languages.

## Key invariants to preserve

- **Defender-authoritative hidden info.** Each peer only knows its own secret submarine position. Torpedo hit/miss and Sonar clues are computed by the *defending* peer in `applyRemote` and sent back as reply messages (`torpedo-res`, `sonar-res`). Never have the attacker decide the outcome.
- **Determinism from a shared seed.** The host generates the map seed and sends it inside the offer payload; both peers call `generateMap(seed)` to derive the identical map. Anything affecting game state must stay deterministic given the seed and the message stream — keep `Math.random()` out of the engine's state transitions (Sonar clue generation takes an injectable `rng`, defaulting to `Math.random`, precisely so it can be tested deterministically).
- **Turn / extra-turn mechanic.** Surfacing grants the opponent `SURFACE_SKIP` consecutive turns; the engine tracks this via `myExtraTurns` / `enemyExtraTurns`. Turn handoff goes through `endMyTurn` / `endEnemyTurn` — route turn changes through these rather than mutating `turn` directly.
- **Energy is a single shared pool** (capped at `MAX_ENERGY`), not per-system. Surface refills it to full.

## Known limitations (by design)

Symmetric NAT (needs a TURN server) is unsupported — same-WiFi is the reliable case. Anti-cheat is only "no manual entry of results"; a modified client can still cheat.
