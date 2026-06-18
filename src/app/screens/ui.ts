/**
 * Shared Tailwind utility strings replacing the old globals.css component classes.
 * Import these in screens/components instead of using the old class names.
 */

/**
 * .screen:
 *   flex:1; min-height:0; display:flex; flex-direction:column;
 *   width:100%; max-width:460px; margin-inline:auto;
 *   padding:64px 18px 30px; position:relative; z-index:5;
 *   animation:screen-in .45s cubic-bezier(.2,.7,.2,1) both;
 *   @md: max-width:540px; padding-left:28px; padding-right:28px; padding-top:84px;
 *   @lg: max-width:600px;
 */
export const SCREEN =
  'flex-1 min-h-0 flex flex-col w-full max-w-[460px] mx-auto ' +
  'px-[18px] pt-[64px] pb-[30px] relative z-[5] animate-screen-in ' +
  'md:max-w-[540px] md:px-[28px] md:pt-[84px] lg:max-w-[600px]';

/**
 * .btn:
 *   font-family:var(--font-mono); font-size:12px; letter-spacing:.14em; text-transform:uppercase;
 *   font-weight:600; border-radius:var(--r-sm); cursor:pointer; border:1px solid var(--line);
 *   background:var(--panel-2); color:var(--ink);
 *   padding:13px 16px; transition:transform .12s, background .2s, border-color .2s, box-shadow .2s;
 *   display:inline-flex; align-items:center; justify-content:center; gap:9px;
 *   -webkit-tap-highlight-color:transparent; user-select:none;
 *   :active → transform:scale(.96);
 *   :disabled → opacity:.34; cursor:not-allowed;
 */
export const BTN =
  'font-mono text-[12px] tracking-[.14em] uppercase font-semibold rounded-sm2 cursor-pointer ' +
  'border border-line bg-panel-2 text-ink px-[16px] py-[13px] ' +
  'transition-[transform,background,border-color,box-shadow] duration-[120ms,200ms,200ms,200ms] ' +
  'inline-flex items-center justify-center gap-[9px] select-none ' +
  'active:scale-[.96] disabled:opacity-[.34] disabled:cursor-not-allowed ' +
  '[-webkit-tap-highlight-color:transparent]';

/**
 * .btn.primary:
 *   background:linear-gradient(180deg,var(--accent),var(--accent-deep));
 *   color:#04130c; border-color:transparent;
 *   box-shadow:0 8px 22px -8px var(--accent), inset 0 1px 0 rgba(255,255,255,.35);
 *   :active → transform:scale(.97)
 */
export const BTN_PRIMARY =
  BTN +
  ' [background:linear-gradient(180deg,var(--accent),var(--accent-deep))] ' +
  'text-[#04130c] border-transparent ' +
  'shadow-[0_8px_22px_-8px_var(--accent),inset_0_1px_0_rgba(255,255,255,.35)] ' +
  'active:scale-[.97]';

/**
 * .btn.ghost:
 *   background:transparent;
 */
export const BTN_GHOST = BTN + ' bg-transparent';

/**
 * .btn.danger:
 *   color:var(--danger); border-color:color-mix(in srgb,var(--danger) 40%,transparent)
 */
export const BTN_DANGER =
  BTN + ' text-danger border-[color-mix(in_srgb,var(--danger)_40%,transparent)]';

/**
 * .btn.ghost.copied:
 *   color:var(--accent); border-color:color-mix(in srgb,var(--accent) 50%,transparent);
 *   background:color-mix(in srgb,var(--accent) 12%,transparent); animation:copy-pop .4s ease;
 */
export const BTN_COPIED =
  ' text-accent border-[color-mix(in_srgb,var(--accent)_50%,transparent)]' +
  ' [background:color-mix(in_srgb,var(--accent)_12%,transparent)] animate-[copy-pop_.4s_ease]';

/**
 * .kicker:
 *   font-family:var(--font-mono); font-size:11px; letter-spacing:.32em;
 *   text-transform:uppercase; color:var(--accent);
 * .kicker.enemy → color:var(--enemy)
 */
export const KICKER = 'font-mono text-[11px] tracking-[.32em] uppercase text-accent';
export const KICKER_ENEMY = 'font-mono text-[11px] tracking-[.32em] uppercase text-enemy';

/**
 * .title:
 *   font-weight:700; line-height:.98; letter-spacing:-.02em;
 */
export const TITLE = 'font-bold leading-[.98] tracking-[-0.02em]';

/**
 * .mono: font-family:var(--font-mono)
 */
export const MONO = 'font-mono';

/**
 * .muted: color:var(--muted)
 */
export const MUTED = 'text-muted';

/**
 * .panel:
 *   background:var(--panel); border:1px solid var(--line); border-radius:var(--r);
 */
export const PANEL = 'bg-panel border border-line rounded-box';

/**
 * .hud-card:
 *   background:var(--panel); border:1px solid var(--line); border-radius:var(--r);
 *   padding:12px 13px;
 */
export const HUD_CARD = 'bg-panel border border-line rounded-box p-[12px_13px]';

/**
 * .chip:
 *   display:inline-flex; align-items:center; gap:6px;
 *   font-family:var(--font-mono); font-size:10px; letter-spacing:.1em;
 *   text-transform:uppercase; color:var(--muted);
 *   border:1px solid var(--line); border-radius:999px; padding:5px 10px;
 */
export const CHIP =
  'inline-flex items-center gap-[6px] font-mono text-[10px] tracking-[.1em] uppercase ' +
  'text-muted border border-line rounded-full px-[10px] py-[5px]';

/**
 * .chip.copied-flash:
 *   animation:copied-flash .9s ease; border-color:var(--accent); color:var(--accent);
 */
export const CHIP_COPIED_FLASH = ' animate-copied-flash border-accent text-accent';

/**
 * .col: display:flex; flex-direction:column;
 * .row: display:flex;
 * .center: align-items:center; justify-content:center;
 * .between: justify-content:space-between;
 * .grow: flex:1; min-height:0;
 */
export const COL = 'flex flex-col';
export const ROW = 'flex';
export const CENTER = 'items-center justify-center';
export const BETWEEN = 'justify-between';
export const GROW = 'flex-1 min-h-0';

/**
 * .dot (inline status dot, used in TopBar, ConnectScreen, page.tsx):
 *   width:6px; height:6px; border-radius:50%; background:var(--accent);
 *   box-shadow:0 0 8px var(--accent); display:inline-block; margin-right:6px;
 *   animation:pulse 2s ease-in-out infinite; vertical-align:middle;
 */
export const DOT =
  'inline-block align-middle w-[6px] h-[6px] rounded-full bg-accent ' +
  'shadow-[0_0_8px_var(--accent)] mr-[6px] animate-pulse';

/**
 * .ico: width:22px; height:22px  (used on action buttons; SVG on BTN uses different size)
 */
export const ICO = 'w-[17px] h-[17px]';

/**
 * Action grid button (.action):
 *   position:relative; display:flex; flex-direction:column; align-items:center; gap:5px;
 *   padding:11px 6px 9px; border-radius:var(--r-sm);
 *   border:1px solid var(--line); background:var(--panel-2); color:var(--ink);
 *   cursor:pointer; transition:transform .12s, border-color .2s, background .2s;
 *   -webkit-tap-highlight-color:transparent;
 *   :active → transform:scale(.94);
 *   :disabled → opacity:.3; pointer-events:none;
 */
export const ACTION =
  'relative flex flex-col items-center gap-[3px] pt-[8px] px-[5px] pb-[6px] ' +
  'rounded-sm2 border border-line bg-panel-2 text-ink ' +
  'cursor-pointer transition-[transform,border-color,background] duration-[120ms,200ms,200ms] ' +
  'active:scale-[.94] disabled:opacity-[.3] disabled:pointer-events-none ' +
  '[-webkit-tap-highlight-color:transparent]';

/**
 * .action.armed:
 *   border-color:var(--danger);
 *   background:color-mix(in srgb,var(--danger) 16%,var(--panel-2));
 *   box-shadow:0 0 0 1px var(--danger), 0 0 18px -4px var(--danger);
 */
export const ACTION_ARMED =
  ' border-danger [background:color-mix(in_srgb,var(--danger)_16%,var(--panel-2))] ' +
  'shadow-[0_0_0_1px_var(--danger),0_0_18px_-4px_var(--danger)]';

/**
 * .action .lbl:
 *   font-family:var(--font-mono); font-size:9.5px; letter-spacing:.1em; text-transform:uppercase;
 */
export const ACTION_LBL = 'font-mono text-[8.5px] tracking-[.1em] uppercase';

/**
 * .action .cost:
 *   position:absolute; top:5px; right:6px;
 *   font-family:var(--font-mono); font-size:8.5px; color:var(--gold);
 */
export const ACTION_COST = 'absolute top-[5px] right-[6px] font-mono text-[8.5px] text-gold';

/**
 * D-pad container (.dpad):
 *   display:grid; grid-template-columns:repeat(3,1fr); gap:6px; width:156px;
 */
export const DPAD = 'grid grid-cols-3 gap-[6px] w-[156px]';

/**
 * D-pad button (.pad):
 *   aspect-ratio:1; border:1px solid var(--line); background:var(--panel-2);
 *   border-radius:var(--r-sm); color:var(--ink); cursor:pointer;
 *   display:grid; place-items:center;
 *   transition:transform .1s, background .2s;
 *   -webkit-tap-highlight-color:transparent;
 *   :active → transform:scale(.9); background:color-mix(in srgb,var(--accent) 22%,var(--panel-2));
 *   :disabled → opacity:.25; pointer-events:none;
 */
export const PAD =
  'aspect-square border border-line bg-panel-2 rounded-sm2 text-ink cursor-pointer ' +
  'grid place-items-center transition-[transform,background] duration-[100ms,200ms] ' +
  'active:scale-[.9] active:[background:color-mix(in_srgb,var(--accent)_22%,var(--panel-2))] ' +
  'disabled:opacity-[.25] disabled:pointer-events-none ' +
  '[-webkit-tap-highlight-color:transparent]';

/**
 * HP pip (.pip):
 *   width:16px; height:9px; border-radius:3px; background:var(--faint);
 *   border:1px solid var(--line);
 * .pip.on → background:var(--accent); border-color:transparent; box-shadow:0 0 8px -1px var(--accent)
 * .pip.enemy.on → background:var(--enemy); box-shadow:0 0 8px -1px var(--enemy)
 * .pip.lost → background:transparent; border-style:dashed;
 */
export const PIP = 'w-[16px] h-[9px] rounded-[3px] bg-faint border border-line';
export const PIP_ON = 'w-[16px] h-[9px] rounded-[3px] bg-accent border-transparent shadow-[0_0_8px_-1px_var(--accent)]';
export const PIP_ENEMY_ON = 'w-[16px] h-[9px] rounded-[3px] bg-enemy border-transparent shadow-[0_0_8px_-1px_var(--enemy)]';
export const PIP_LOST = 'w-[16px] h-[9px] rounded-[3px] bg-transparent border border-dashed border-line';

/**
 * Energy bar (.ebar):
 *   height:7px; border-radius:999px; background:var(--faint);
 *   overflow:hidden; border:1px solid var(--line);
 * .ebar > i (fill bar):
 *   display:block; height:100%; border-radius:999px;
 *   background:linear-gradient(90deg,var(--accent-deep),var(--accent));
 *   transition:width .5s cubic-bezier(.2,.7,.2,1);
 *   box-shadow:0 0 10px var(--accent);
 * .ebar.full > i:
 *   background:linear-gradient(90deg,var(--gold),#fff);
 *   box-shadow:0 0 12px var(--gold);
 */
export const EBAR = 'h-[6px] rounded-full bg-faint overflow-hidden border border-line';
export const EBAR_FILL =
  'block h-full rounded-full [background:linear-gradient(90deg,var(--accent-deep),var(--accent))] ' +
  '[transition:width_.5s_cubic-bezier(.2,.7,.2,1)] shadow-[0_0_10px_var(--accent)]';
export const EBAR_FILL_FULL =
  'block h-full rounded-full [background:linear-gradient(90deg,var(--gold),#fff)] ' +
  '[transition:width_.5s_cubic-bezier(.2,.7,.2,1)] shadow-[0_0_12px_var(--gold)]';

/**
 * Turn banner (.turn-banner):
 *   display:flex; align-items:center; gap:9px; padding:9px 13px; border-radius:999px;
 *   border:1px solid var(--line); font-family:var(--font-mono); font-size:11px;
 *   letter-spacing:.14em; text-transform:uppercase;
 * .turn-banner.mine → color:var(--accent); border-color:color-mix(in srgb,var(--accent) 45%,transparent);
 *   background:color-mix(in srgb,var(--accent) 10%,transparent);
 * .turn-banner.theirs → color:var(--enemy); border-color:color-mix(in srgb,var(--enemy) 35%,transparent);
 *   background:color-mix(in srgb,var(--enemy) 8%,transparent);
 */
export const TURN_BANNER_BASE =
  'flex items-center gap-[9px] px-[13px] py-[9px] rounded-full border border-line ' +
  'font-mono text-[11px] tracking-[.14em] uppercase';
export const TURN_BANNER_MINE =
  TURN_BANNER_BASE +
  ' text-accent [border-color:color-mix(in_srgb,var(--accent)_45%,transparent)] ' +
  '[background:color-mix(in_srgb,var(--accent)_10%,transparent)]';
export const TURN_BANNER_THEIRS =
  TURN_BANNER_BASE +
  ' text-enemy [border-color:color-mix(in_srgb,var(--enemy)_35%,transparent)] ' +
  '[background:color-mix(in_srgb,var(--enemy)_8%,transparent)]';

/**
 * Log feed (.log):
 *   font-family:var(--font-mono); font-size:10.5px; line-height:1.55; letter-spacing:.02em;
 * .log .row:
 *   display:flex; gap:8px; padding:2px 0; opacity:.9; animation:logrow .35s ease both;
 * .log .t → color:var(--muted); flex-shrink:0;
 * .log .me → color:var(--accent);
 * .log .en → color:var(--enemy);
 * .log .hit → color:var(--danger); font-weight:700;
 */
export const LOG = 'font-mono text-[10.5px] leading-[1.55] tracking-[.02em]';
export const LOG_ROW = 'flex gap-[8px] py-[2px] opacity-90 animate-logrow';
export const LOG_T = 'text-muted shrink-0';
export const LOG_ME = 'text-accent';
export const LOG_EN = 'text-enemy';
export const LOG_HIT = 'text-danger font-bold';

/**
 * .shake: animation:shake .5s cubic-bezier(.36,.07,.19,.97) both;
 */
export const SHAKE = 'animate-shake';

/**
 * Sheet overlay (.sheet-wrap):
 *   position:absolute; inset:0; z-index:40; display:flex; align-items:flex-end;
 *   background:rgba(2,6,10,.55); animation:reveal .2s both;
 */
export const SHEET_WRAP =
  'absolute inset-0 z-[40] flex items-end bg-[rgba(2,6,10,.55)] animate-reveal';

/**
 * Sheet panel (.sheet):
 *   width:100%; background:var(--panel); border-top:1px solid var(--line);
 *   border-radius:22px 22px 0 0; padding:18px 18px 30px;
 *   animation:sheet-up .32s cubic-bezier(.2,.8,.2,1) both;
 *   box-shadow:0 -20px 50px -20px #000;
 */
export const SHEET =
  'w-full bg-panel border-t border-line rounded-t-[22px] ' +
  'px-[18px] pt-[18px] pb-[30px] animate-sheet-up shadow-[0_-20px_50px_-20px_#000]';

/**
 * Seg control (.seg):
 *   display:flex; gap:6px;
 * .seg button:
 *   flex:1; padding:12px 0; border-radius:var(--r-sm); border:1px solid var(--line);
 *   background:var(--panel-2); color:var(--ink); font-family:var(--font-mono); font-size:13px;
 *   cursor:pointer; transition:.15s; -webkit-tap-highlight-color:transparent;
 * .seg button.on:
 *   background:color-mix(in srgb,var(--accent) 24%,var(--panel-2));
 *   border-color:var(--accent); color:var(--accent);
 */
export const SEG = 'flex gap-[6px]';
export const SEG_BTN =
  'flex-1 py-[12px] rounded-sm2 border border-line bg-panel-2 text-ink ' +
  'font-mono text-[13px] cursor-pointer transition-[background,border-color,color] duration-150 ' +
  '[-webkit-tap-highlight-color:transparent]';
export const SEG_BTN_ON =
  SEG_BTN +
  ' [background:color-mix(in_srgb,var(--accent)_24%,var(--panel-2))] border-accent text-accent';

/**
 * QR frame (.qr-frame):
 *   position:relative; padding:14px; background:#fff; border-radius:var(--r);
 *   box-shadow:0 18px 40px -16px rgba(0,0,0,.7);
 * .corner (base):
 *   position:absolute; width:22px; height:22px; border:2px solid var(--accent);
 * Corner offsets: tl/tr/bl/br via individual utilities
 */
export const QR_FRAME =
  'relative p-[14px] bg-white rounded-box shadow-[0_18px_40px_-16px_rgba(0,0,0,.7)]';
export const QR_CORNER_BASE = 'absolute w-[22px] h-[22px] border-2 border-accent';
export const QR_CORNER_TL = QR_CORNER_BASE + ' top-[-6px] left-[-6px] border-r-0 border-b-0';
export const QR_CORNER_TR = QR_CORNER_BASE + ' top-[-6px] right-[-6px] border-l-0 border-b-0';
export const QR_CORNER_BL = QR_CORNER_BASE + ' bottom-[-6px] left-[-6px] border-r-0 border-t-0';
export const QR_CORNER_BR = QR_CORNER_BASE + ' bottom-[-6px] right-[-6px] border-l-0 border-t-0';

/**
 * .sub-token:
 *   transition:transform .55s cubic-bezier(.34,.8,.3,1);
 */
export const SUB_TOKEN = '[transition:transform_.55s_cubic-bezier(.34,.8,.3,1)]';

/**
 * .sweep (Board version — same as MiniRadar but inline):
 *   (see SWEEP_CLS in bits.tsx — imported there; repeat here for Board.tsx)
 */
export const SWEEP_CLS =
  'absolute inset-0 rounded-[inherit] pointer-events-none z-[4] opacity-50 ' +
  '[background:conic-gradient(from_0deg,transparent_0deg,transparent_300deg,color-mix(in_srgb,var(--scan)_65%,transparent)_352deg,var(--scan)_360deg)] ' +
  '[-webkit-mask:radial-gradient(circle_at_50%_50%,#000_0_70%,transparent_71%)] ' +
  '[mask:radial-gradient(circle_at_50%_50%,#000_0_70%,transparent_71%)] ' +
  'animate-[sweep-rot_5.5s_linear_infinite] ' +
  'motion-reduce:animate-none motion-reduce:opacity-[.18]';
