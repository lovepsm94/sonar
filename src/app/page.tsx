'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useGame } from './useGame';
import { useRadioOperator } from './useRadioOperator';
import { PeerLink } from '@/net/webrtc';
import { encodeSignal, decodeSignal } from '@/net/signaling';
import { makeQrDataUrl } from '@/net/qr';
import { generateMap } from '@/game/map';
import { mulberry32 } from '@/game/rng';
import { HomeScreen } from './screens/HomeScreen';
import { ConnectScreen } from './screens/ConnectScreen';
import { PlaceScreen } from './screens/PlaceScreen';
import { PlayScreen } from './screens/PlayScreen';
import { EndScreen } from './screens/EndScreen';
import { MiniRadar, WaitDots } from './screens/bits';
import { useI18n } from './i18n/I18nContext';
import { SCREEN, CHIP, DOT } from './screens/ui';
import type { Fx } from './board/Board';
import type { Cell, Direction, GameState } from '@/game/types';
import { COST, MAX_ENERGY, TORPEDO_RANGE } from '@/game/types';
import { manhattan, inBounds, step, sameCell } from '@/game/geo';
import type { WireMessage } from '@/game/protocol';

type UI = 'home' | 'host-wait' | 'guest-wait' | 'placing' | 'playing' | 'over';

interface LogEntry { id: number; who: 'me' | 'en' | 'hit'; vi: string; en: string; }
interface Stats { turns: number; hits: number; sonars: number; }

/** Omit that distributes across a union so each Fx variant keeps its own fields. */
type DistributiveOmit<T, K extends keyof never> = T extends unknown ? Omit<T, K> : never;

const colLabel = (c: Cell) => String.fromCharCode(65 + c.x) + (c.y + 1);
const colCh = (x: number) => String.fromCharCode(65 + x);
const lineLabel = (axis: 'row' | 'col', value: number, lang: 'vi' | 'en') =>
  axis === 'row'
    ? (lang === 'vi' ? 'Hàng ' : 'Row ') + (value + 1)
    : (lang === 'vi' ? 'Cột ' : 'Col ') + colCh(value);

// Compass labels — directions are announced (Captain Sonar style); only the start position stays hidden.
const DIR_VI: Record<Direction, string> = { N: 'Bắc', S: 'Nam', E: 'Đông', W: 'Tây' };
const DIR_EN: Record<Direction, string> = { N: 'North', S: 'South', E: 'East', W: 'West' };

/** Deterministic next-round seed — both peers derive the same new map from the old seed. */
const nextSeed = (s: number) => Math.imul((s ^ 0x9e3779b9) >>> 0, 2654435761) >>> 0;

export default function Page() {
  const { state, attach, dispatch, reset, link, connLost } = useGame();
  const {
    ro, enabled: roOn, roCount,
    record: roRecord, pinCell: roPinCell, toggle: roToggle, reset: roReset,
  } = useRadioOperator(state?.map);
  const { t, lang } = useI18n();
  const stateRef = useRef<GameState | null>(null);
  const [ui, setUi] = useState<UI>('home');
  const [myCode, setMyCode] = useState<string | null>(null);
  // Answer QR pre-rendered during the guest "joining" loader, so the connect screen
  // appears with the QR already drawn (no empty-placeholder flash).
  const [guestQr, setGuestQr] = useState<string | null>(null);
  const [needScan, setNeedScan] = useState(false);
  const [fatal, setFatal] = useState<null | 'connect'>(null);
  const [preparing, setPreparing] = useState<null | 'host' | 'guest'>(null);
  const hostLink = useRef<PeerLink | null>(null);
  const seedRef = useRef<number>(0);
  const joinedRef = useRef(false);

  // FX / log / stats / shake
  const [effects, setEffects] = useState<Fx[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [shake, setShake] = useState(false);
  const [stats, setStats] = useState<Stats>({ turns: 0, hits: 0, sonars: 0 });
  const fxIdRef = useRef(0);
  const logIdRef = useRef(0);
  const lastTorpedoTargetRef = useRef<Cell | null>(null);
  const langRef = useRef<'vi' | 'en'>('vi');

  const addFx = useCallback((fx: DistributiveOmit<Fx, 'id'>): number => {
    const id = ++fxIdRef.current;
    setEffects((e) => [...e, { ...fx, id } as Fx]);
    return id;
  }, []);

  const removeFx = useCallback((id: number) => {
    setEffects((e) => e.filter((x) => x.id !== id));
  }, []);

  const pushLog = useCallback((who: 'me' | 'en' | 'hit', vi: string, en: string) => {
    const id = ++logIdRef.current;
    setLog((l) => [...l, { id, who, vi, en }]);
  }, []);

  const doShake = useCallback(() => {
    setShake(true);
    setTimeout(() => setShake(false), 520);
  }, []);

  // Keep langRef in sync so the (memoized) onApplied callback logs in the current language.
  useEffect(() => { langRef.current = lang; }, [lang]);

  // Hide the global topbar (CSS in tailwind config) on the QR/connect screens and once
  // in a match, so those screens can drop their top padding and reclaim the space.
  const onConnectScreen = ui === 'host-wait' || ui === 'guest-wait';
  const hideTopbar = onConnectScreen || (!!state && (state.phase === 'placing' || state.phase === 'playing') && !connLost);
  useEffect(() => {
    document.documentElement.dataset.ingame = hideTopbar ? '1' : '';
    return () => { document.documentElement.dataset.ingame = ''; };
  }, [hideTopbar]);

  // Latest state for handlers that fire outside render (rematch click).
  useEffect(() => { stateRef.current = state; }, [state]);

  // Rematch: reset to a fresh round (new map) at the placement step, keeping the connection.
  const startRematch = useCallback((seed: number) => {
    reset(generateMap(seed));
    setLog([]);
    setStats({ turns: 0, hits: 0, sonars: 0 });
    setEffects([]);
    roReset();
    setUi('placing');
  }, [reset, roReset]);

  const onRematch = useCallback(() => {
    const cur = stateRef.current;
    if (!cur) return;
    const seed = nextSeed(cur.map.seed);
    link.current?.send({ t: 'rematch', seed });
    startRematch(seed);
  }, [link, startRematch]);

  // onApplied: handle incoming WireMessages for FX/log
  const onApplied = useCallback((msg: WireMessage, _prev: GameState, next: GameState) => {
    const lang = langRef.current;

    if (msg.t === 'rematch') {
      // Rematch is a SESSION-level reset handled here, not in the engine reducer: it also
      // clears presentation state (log/stats/FX/screen) that lives outside GameState.
      // Idempotent against duplicate frames — startRematch swaps in a new GameLoop seeded
      // with msg.seed, so a repeated frame sees next.map.seed === msg.seed and is skipped.
      if (msg.seed !== next.map.seed) startRematch(msg.seed);
      return;
    }

    if (msg.t === 'torpedo') {
      // Enemy fired torpedo at us — show impact and log the shot (hit or miss).
      const target = msg.target;
      addFx({ type: 'impact', at: target, hit: false }); // hit result comes in torpedo-res
      lastTorpedoTargetRef.current = target;
      const hit = next.me.hp < _prev.me.hp;
      if (hit) {
        doShake();
        pushLog('hit',
          `✕ Trúng thân tàu tại ${colLabel(target)}!`,
          `✕ Hull hit at ${colLabel(target)}!`
        );
      } else {
        pushLog('en',
          `Đối phương phóng Torpedo → ${colLabel(target)} (trượt)`,
          `Opponent fired torpedo → ${colLabel(target)} (miss)`
        );
      }
      roRecord({ kind: 'torpedo', target });
    }

    if (msg.t === 'sonar-req') {
      // Enemy pinged us — the engine set pendingSonar; PlayScreen prompts for the reveal.
      pushLog('en',
        'Đối phương phát sonar — bạn phải lộ vị trí!',
        'Opponent pinged sonar — you must reveal your position!'
      );
    }

    if (msg.t === 'torpedo-res') {
      // Result of our torpedo
      const target = lastTorpedoTargetRef.current;
      if (target) {
        if (msg.hit) {
          pushLog('me',
            `⊕ TRÚNG ĐÍCH ${colLabel(target)}!`,
            `⊕ DIRECT HIT ${colLabel(target)}!`
          );
          setStats((s) => ({ ...s, hits: s.hits + 1 }));
        } else {
          pushLog('me', 'Trượt.', 'Miss.');
        }
      }
      // update impact FX with hit status
      if (target) {
        addFx({ type: 'impact', at: target, hit: msg.hit });
      }
    }

    if (msg.t === 'surface') {
      addFx({ type: 'surface', at: msg.cell });
      pushLog('en',
        `Đối phương nổi lên tại ${colLabel(msg.cell)}`,
        `Opponent surfaced at ${colLabel(msg.cell)}`
      );
      roRecord({ kind: 'surface', cell: msg.cell });
    }

    if (msg.t === 'sonar-res') {
      // Enemy was forced to reveal a true row/col — feed the Radio Operator + log it.
      roRecord({ kind: 'sonar', axis: msg.axis, value: msg.value });
      pushLog('me',
        `Sonar — địch đang ở ${lineLabel(msg.axis, msg.value, 'vi')}`,
        `Sonar — enemy on ${lineLabel(msg.axis, msg.value, 'en')}`
      );
      setStats((s) => ({ ...s, sonars: s.sonars + 1 }));
    }

    if (msg.t === 'move') {
      pushLog('en',
        `Đối phương di chuyển ${DIR_VI[msg.dir]}`,
        `Opponent moved ${DIR_EN[msg.dir]}`
      );
      roRecord({ kind: 'move', dir: msg.dir });
      setStats((s) => ({ ...s, turns: s.turns + 1 }));
    }

    if (msg.t === 'silence') {
      // Stealth move — distance/direction stay hidden (matches the wire message).
      pushLog('en',
        'Đối phương lặn im lặng — hướng đi ẩn',
        'Opponent ran silent — heading hidden'
      );
      roRecord({ kind: 'silence' });
      setStats((s) => ({ ...s, turns: s.turns + 1 }));
    }

    void lang; // lang is read via langRef; keep referenced to satisfy the dep lint
  }, [addFx, pushLog, doShake, startRematch, roRecord]);

  const createRoom = useCallback(async () => {
    const seed = Math.floor(mulberry32((Date.now() & 0xffffffff) >>> 0)() * 0xffffffff) >>> 0;
    seedRef.current = seed;
    const pl = new PeerLink();
    hostLink.current = pl;
    pl.onOpen = () => {
      attach(pl, generateMap(seed), 'host', onApplied);
      setUi('placing');
    };
    setPreparing('host');
    try {
      const sdp = await pl.createOffer();
      if (hostLink.current !== pl) return; // cancelled (went back home)
      setMyCode(encodeSignal({ role: 'offer', seed, sdp }));
      setNeedScan(true);
      setUi('host-wait');
      setPreparing(null);
    } catch {
      setPreparing(null);
      setFatal('connect');
    }
  }, [attach, onApplied]);

  const onHostScanned = useCallback(async (text: string) => {
    // Accept either a scanned QR, a pasted raw token, or a pasted link (#fragment).
    const code = text.includes('#') ? text.slice(text.lastIndexOf('#') + 1) : text.trim();
    let payload;
    try { payload = decodeSignal(code); } catch { return; }
    if (payload.role !== 'answer') return;
    if (!hostLink.current) return;
    try {
      await hostLink.current.acceptAnswer(payload.sdp);
    } catch {
      setFatal('connect');
    }
  }, []);

  const joinWithOffer = useCallback(async (raw: string) => {
    if (joinedRef.current) return;
    const code = raw.includes('#') ? raw.slice(raw.lastIndexOf('#') + 1) : raw.trim();
    if (!code) return;
    let payload;
    try { payload = decodeSignal(code); } catch { return; }
    if (payload.role !== 'offer') return;
    joinedRef.current = true;
    setPreparing('guest');
    try {
      const pl = new PeerLink();
      hostLink.current = pl;
      pl.onOpen = () => {
        attach(pl, generateMap(payload.seed), 'guest', onApplied);
        setUi('placing');
      };
      const answerSdp = await pl.acceptOfferCreateAnswer(payload.sdp);
      if (hostLink.current !== pl) return; // cancelled (went back home)
      const answerCode = encodeSignal({ role: 'answer', seed: payload.seed, sdp: answerSdp });
      // Pre-render the QR while the loader is still up, so guest-wait shows it instantly.
      const qr = await makeQrDataUrl(answerCode);
      if (hostLink.current !== pl) return; // cancelled during QR render
      setMyCode(answerCode);
      setGuestQr(qr);
      setNeedScan(false);
      setUi('guest-wait');
      setPreparing(null);
    } catch {
      setPreparing(null);
      setFatal('connect');
      joinedRef.current = false;
    }
  }, [attach, onApplied]);

  // Auto-join when the page is opened via a shared offer link (#fragment).
  // joinWithOffer synchronously flips to the 'guest' loader (for a valid offer) before
  // its first await, so we can drop the cold-load splash overlay right after: the React
  // loader is already showing underneath, making the hand-off seamless and skipping any
  // HomeScreen flash. (Invalid/empty hash → no loader → splash drops back to home.)
  useEffect(() => {
    if (ui !== 'home') return;
    const hash = typeof location !== 'undefined' ? location.hash.slice(1) : '';
    if (hash) void joinWithOffer(hash);
    if (typeof document !== 'undefined') document.documentElement.removeAttribute('data-joining');
  }, [ui, joinWithOffer]);

  // Transition to 'over' when phase changes
  useEffect(() => {
    if (state?.phase === 'over' && ui === 'playing') {
      setUi('over');
    }
    if (state?.phase === 'playing' && ui === 'placing') {
      setUi('playing');
    }
  }, [state?.phase, ui]);

  // Wrap dispatch to add local FX/log
  const wrappedDispatch = useCallback((action: Parameters<typeof dispatch>[0]) => {
    if (!state) return;

    if (action.kind === 'move') {
      pushLog('me',
        `Di chuyển ${DIR_VI[action.dir]}`,
        `Move ${DIR_EN[action.dir]}`
      );
      setStats((s) => ({ ...s, turns: s.turns + 1 }));
    }

    if (action.kind === 'sonar') {
      pushLog('me',
        'Phát sonar — buộc địch lộ vị trí…',
        'Sonar ping — forcing a reveal…'
      );
    }

    if (action.kind === 'sonar-reveal') {
      pushLog('hit',
        `Bạn để lộ ${lineLabel(action.axis, action.axis === 'row' ? state.me.pos.y : state.me.pos.x, 'vi')}`,
        `You revealed ${lineLabel(action.axis, action.axis === 'row' ? state.me.pos.y : state.me.pos.x, 'en')}`
      );
    }

    if (action.kind === 'silence') {
      pushLog('me',
        'Lặn im lặng — vị trí ẩn đi',
        'Ran silent — position hidden'
      );
      // Compute destination by stepping dist times in dir from current pos
      let dest = state.me.pos;
      for (let i = 0; i < action.dist; i++) dest = step(dest, action.dir);
      addFx({ type: 'silence', from: state.me.pos, to: dest });
    }

    if (action.kind === 'torpedo') {
      const target = action.target;
      lastTorpedoTargetRef.current = target;
      addFx({ type: 'torpedo', from: state.me.pos, to: target, hit: false });
      pushLog('me',
        `Phóng Torpedo → ${colLabel(target)}`,
        `Torpedo → ${colLabel(target)}`
      );
    }

    if (action.kind === 'surface') {
      pushLog('me',
        `Nổi lên tại ${colLabel(state.me.pos)} — nạp đầy năng lượng`,
        `Surfaced at ${colLabel(state.me.pos)} — energy refilled`
      );
      addFx({ type: 'surface', at: state.me.pos });
    }

    if (action.kind === 'resign') {
      pushLog('me', 'Bạn đầu hàng.', 'You resigned.');
    }

    if (action.kind === 'place') {
      pushLog('me',
        `Hạ thủy tại ${colLabel(action.cell)}`,
        `Launched at ${colLabel(action.cell)}`
      );
    }

    dispatch(action);
  }, [state, dispatch, addFx, pushLog]);

  if (fatal === 'connect') return (
    <main className="min-h-screen grid place-items-center gap-3 p-6">
      <p>⚠️ Lỗi kết nối / Connection error</p>
      <button onClick={() => location.reload()}>↻</button>
    </main>
  );

  if (preparing) return (
    <div className={SCREEN + ' justify-center items-center text-center gap-5'}>
      <MiniRadar size={140} />
      <div className={CHIP}>
        <span className={DOT} />
        {preparing === 'host' ? t('home.creating') : t('home.joining')} <WaitDots />
      </div>
    </div>
  );

  if (ui === 'home') return <HomeScreen onCreate={createRoom} onJoinCode={joinWithOffer} />;
  if (ui === 'host-wait') return <ConnectScreen myCode={myCode} needScan={needScan} onScanned={onHostScanned} />;
  if (ui === 'guest-wait') return <ConnectScreen myCode={myCode} needScan={false} onScanned={() => {}} qr={guestQr} />;

  if (!state) return <main className="min-h-screen grid place-items-center gap-3 p-6">…</main>;

  if (connLost) {
    return <main className="min-h-screen grid place-items-center gap-3 p-6">⚠️ Mất kết nối / Connection lost</main>;
  }

  // Still choosing a start cell → placement screen. Once we've dived but the
  // opponent hasn't, fall through to the in-game screen in a locked "waiting" state.
  if (state.phase === 'placing' && !state.iPlaced) {
    return <PlaceScreen state={state} onPlace={(c) => wrappedDispatch({ kind: 'place', cell: c })} />;
  }

  if (state.phase === 'over' || ui === 'over') {
    return (
      <EndScreen
        state={state}
        stats={stats}
        onRematch={onRematch}
        onHome={() => { location.hash = ''; location.reload(); }}
      />
    );
  }

  const waiting = state.phase === 'placing'; // deployed, waiting for opponent to deploy
  const myTurn = state.turn === state.side && state.phase === 'playing';
  // While the enemy is surfaced its EXACT cell is shown (the surfaced boat), so tinting
  // the whole sector on top is redundant. Only fall back to the sector tint once they've
  // dived away (surfacedCell cleared) — then the sector is just a lingering clue.
  const revealSectors = state.enemy.surfacedSector && !state.enemy.surfacedCell
    ? [state.enemy.surfacedSector]
    : [];

  return (
    <PlayScreen
      state={state}
      myTurn={myTurn}
      waiting={waiting}
      shake={shake}
      effects={effects}
      onEffectDone={removeFx}
      revealSectors={revealSectors}
      log={log}
      ro={ro}
      roOn={roOn}
      roCount={roCount}
      onToggleRO={roToggle}
      onPinCell={roPinCell}
      onReveal={(axis) => wrappedDispatch({ kind: 'sonar-reveal', axis })}
      onMove={(dir: Direction) => wrappedDispatch({ kind: 'move', dir })}
      onSonar={() => wrappedDispatch({ kind: 'sonar' })}
      onSilence={(dir: Direction, dist: number) => wrappedDispatch({ kind: 'silence', dir, dist })}
      onTorpedo={(c: Cell) => wrappedDispatch({ kind: 'torpedo', target: c })}
      onSurface={() => wrappedDispatch({ kind: 'surface' })}
      onResign={() => wrappedDispatch({ kind: 'resign' })}
    />
  );
}
