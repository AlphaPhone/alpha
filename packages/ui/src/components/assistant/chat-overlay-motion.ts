/**
 * Ask Alpha's sheet motion, copied from the Sunday v119 demo build (old-line Alpha 45f6bed30, the owner's reference):
 * apps/app/src/prototype/chat-overlay-motion-adapter.ts (COA), apps/app/src/ui/components/shell/chat-overlay-motion.ts
 * (COM), apps/app/src/ui/gestures/constants.ts (GC), apps/app/src/ui/components/shell/use-pull-gesture.ts (UPG) and
 * apps/app/src/ui/components/shell/chat-panel-layout.ts (CPL), cited at 45f6bed30. Every value is theirs; only the names
 * of the shapes changed to fit Ask Alpha here. The screen is not scaled here, so v119's canvas scale is 1.
 */

/** COM:7-8 clamp01. */
export const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

/** COM:11-13 OVERLAY_EASE, as COA:16 SHEET_EASE writes it. */
export const SHEET_EASE = "cubic-bezier(0.22,1,0.36,1)";
/** COA:17: a sheet settling after a drag or a detent change. */
export const PANEL_TRANSITION = `height .42s ${SHEET_EASE}, border-radius .42s, opacity .2s`;
/** COA:18-19: a tap opening or closing from the bar changes height only; the sheet is opaque throughout. */
export const RESIZE_TRANSITION = `height .42s ${SHEET_EASE}, border-radius .42s, opacity .12s linear`;
/** COA:20-22: how long a tap close keeps the sheet's composer, then fades it to show the bar in its place. */
export const CLOSE_MS = 400;
export const CLOSE_FADE_MS = 120;
/** COA:312: how long rows are revealed while a resize animates. COA:528: when a tap resize hands back to PANEL_TRANSITION. */
export const REVEAL_MS = 480;
export const RESIZE_SETTLE_MS = 460;

/** GC:13 TAP_SLOP: movement under which a release is a tap, not a drag; the slop every pull check shares. */
export const TAP_SLOP = 8;
/** GC:29 DEFAULT_PULL_DISTANCE: the least pull from the pill (COA:843). */
export const DEFAULT_PULL_DISTANCE = 56;
/** COA:843: the least pull from the input bar. */
export const BAR_PULL_DISTANCE = 24;
/** GC:31 DEFAULT_PULL_VELOCITY: the speed at which a release counts as a pull however short (UPG:449-451, main.tsx:269). */
export const DEFAULT_PULL_VELOCITY = 0.5;

/** COA:91 CHAT_SNAP_ZONE: how close to the collapsed form or the top a release must land to snap there. */
export const CHAT_SNAP_ZONE = 120;
/** COA:93 CHAT_FLICK_VELOCITY: finger speed at release, in pixels per millisecond, that makes a drag a flick. */
export const CHAT_FLICK_VELOCITY = 1;
/** COA:95 FLICK_WINDOW_MS: only this much of the end of a drag counts toward its release speed. */
export const FLICK_WINDOW_MS = 100;
/** COA:97 FLICK_HOLD_MS: a finger held still this long before lifting has not flicked, however fast it got there. */
export const FLICK_HOLD_MS = 80;
/** COA:99 SHEET_MIN_HEIGHT: a remembered sheet never rests shorter than this. */
export const SHEET_MIN_HEIGHT = 200;
/** COA:1104: how many move samples a drag keeps. */
export const KEPT_SAMPLES = 32;
/** COA:1039: the floor is the input bar's height plus this, the gap it rests above the screen's foot. */
export const FLOOR_GAP = 28;
/** COA:1039: the input bar's height when none is drawn to measure. */
export const FALLBACK_BAR = 62;
/** COA:1076: where a pull from the pill starts, at most half the screen. */
export const PILL_START = 80;
/** COA:276 ROW_REVEAL: travel over which a row that has just fit fades in. */
export const ROW_REVEAL = 16;
/** COA:370 CLOSED_COMPOSER_BLOCK: the sheet's composer block while the sheet is not drawing one. */
export const CLOSED_COMPOSER_BLOCK = 98;
/** CPL:14 SHEET_TOP_MARGIN: the half height never reaches closer than this to the top. */
const SHEET_TOP_MARGIN = 72;

export type Sample = { y: number; t: number };

/** COA:105-119 flickSpan: how far the finger rose over how many milliseconds of the end of a drag; none once it had stopped. */
export function flickSpan(track: Sample[], time: number): { rise: number; run: number } {
  const last: Sample | undefined = track[track.length - 1];
  if (!last || time - last.t > FLICK_HOLD_MS) return { rise: 0, run: 0 };
  const end = last.t;
  const first = track.find((sample) => end - sample.t <= FLICK_WINDOW_MS);
  return first && end > first.t ? { rise: first.y - last.y, run: end - first.t } : { rise: 0, run: 0 };
}

/** COA:122-125 releaseVelocity: upward speed at release in pixels per millisecond; zero when the finger had stopped. */
export function releaseVelocity(track: Sample[], time: number): number {
  const { rise, run } = flickSpan(track, time);
  return run > 0 ? rise / run : 0;
}

/** COA:134-144 clampSheetHeight: a remembered height held between the shortest usable sheet and the full screen. */
export function clampSheetHeight(rounded: number, full: number, half: number): number {
  return Math.min(full, Math.max(rounded, Math.min(SHEET_MIN_HEIGHT, half)));
}

/** COA:128-131 restingHeight: the open sheet's resting height, the share of the screen it was left at, else the default. */
export function restingHeight(share: number | undefined, full: number, half: number): number {
  if (!share) return half;
  return clampSheetHeight(Math.round(share * full), full, half);
}

/** COA:436-455 bounds with CPL:71-128 at no keyboard, no inset and no scale: the full height and the default half. */
export function sheetBounds(viewport: number): { full: number; half: number } {
  const half = Math.min(Math.max(SHEET_MIN_HEIGHT, viewport - SHEET_TOP_MARGIN), Math.max(SHEET_MIN_HEIGHT, Math.round(viewport * 0.6)));
  return { full: viewport, half };
}

/** COA:235-259 Drag, without what this app keeps elsewhere: Ask Alpha's form when pressed, and the geometry of the pull. */
export type ChatDrag = {
  open: boolean;
  /** COA:1074-1076: the height the finger's travel is added to. */
  start: number;
  /** COA:802-805: the height the sheet is drawn at, 0 while the bar is pulled down. */
  height: number;
  full: number;
  half: number;
  floor: number;
  /** COA:797: the finger's travel downward since the press. */
  delta: number;
  moved: boolean;
};

/** COA:1071-1077: the drag's geometry at the press, from Ask Alpha open (at `shown`), on the bar, or on the pill. */
export function pressDrag(form: "open" | "bar" | "pill", shown: number, floor: number, viewport: number): ChatDrag {
  const { full, half } = sheetBounds(viewport);
  const start = form === "open" ? shown : Math.min(form === "bar" ? floor : PILL_START, half);
  return { open: form === "open", start, height: form === "open" ? shown : 0, full, half, floor, delta: 0, moved: false };
}

/** COA:793-805 paintChatMotion's geometry: whether the finger is past the slop, and the height it puts the sheet at. */
export function moveDrag(d: ChatDrag, delta: number): boolean {
  if (!d.moved && Math.abs(delta) < TAP_SLOP) return false;
  d.moved = true;
  d.delta = delta;
  d.height = !d.open && delta > 0 ? 0 : clamp01((d.start - delta) / Math.max(1, d.full)) * d.full;
  return true;
}

/** COA:339-346 dockStyle when pulling the resting bar down to dismiss it to the pill: follows the finger downward and fades out. */
export function barDismissPaint(d: ChatDrag): { translateY: number; opacity: number } | undefined {
  if (d.open || d.height > 0 || d.delta <= 0) return undefined;
  return { translateY: d.delta, opacity: 1 - clamp01(Math.abs(d.delta) / Math.max(80, d.half)) };
}

/** COA:261-263 paintedHeight: the sheet never paints shorter than its composer, which stays where the bar rests. */
export function paintedHeight(d: ChatDrag): number {
  return d.height > 0 ? Math.max(d.height, d.floor) : 0;
}

/** COA:268-272 collapseShare: how far an open sheet dragged toward its collapsed form has handed over to it, 0 to 1. */
export function collapseShare(d: ChatDrag): number {
  if (!d.open) return 0;
  const zone = Math.min(CHAT_SNAP_ZONE, (d.full - d.floor) / 3);
  return clamp01((d.floor + zone - d.height) / Math.max(1, zone));
}

/** COA:335-350 dockStyle, for the bar or pill drawn under a sheet a finger holds: hidden while one rises from it, fading in as an open sheet is pulled onto it. */
export function dockOpacity(d: ChatDrag): number {
  if (!d.open) return d.height > 0 ? 0 : 1;
  return collapseShare(d);
}

/** COA:820-823 and COA:984-989: how the sheet is drawn under the finger. */
export function dragPaint(d: ChatDrag): { height: number; opacity: number; radius: string } {
  return { height: paintedHeight(d), opacity: 1 - collapseShare(d), radius: d.height >= d.full ? "0px" : "30px 30px 0 0" };
}

/** COA:281-295 revealRows: a row above the pinned composer stays hidden until it fits, then fades in over ROW_REVEAL. */
export function rowReveal(room: number): number {
  return clamp01(room / ROW_REVEAL);
}

/**
 * UPG:380-479 finish and COA:1108-1124 up: how a drag that moved ended. `tap` when it came back within the slop and was
 * not quick; else its way (a flick's aim, else its travel), whether it was a flick (COA:1120-1122), whether it was quick
 * enough to settle without a least pull (UPG:449-451, 471-478), and how far it went. A touch release can report a stale
 * position, so the furthest observed point stands (UPG:400-409); the latest move counts toward quickness once two real
 * moves were seen and it went past the slop (UPG:419-444); and only a mouse's release is a sample of the flick, which is
 * the speed over the last 100 ms (COA:1117-1122).
 */
export function releaseOf(start: Sample, track: Sample[], lifted: Sample, touch: boolean): { tap: boolean; direction: "up" | "down"; flick: boolean; quick: boolean; travel: number; y: number } {
  const last = track[track.length - 1] ?? lifted;
  const previous = track.length > 1 ? track[track.length - 2] : undefined;
  const useLast = touch && Math.abs(start.y - last.y) > Math.abs(start.y - lifted.y);
  const end = useLast ? last : lifted;
  const rise = start.y - end.y;
  const velocity = rise / Math.max(1, end.t - start.t);
  const recentRise = previous ? previous.y - last.y : 0;
  const recent = previous && previous.t > start.t && Math.abs(recentRise) >= TAP_SLOP ? recentRise / Math.max(1, last.t - previous.t) : velocity;
  const quick = Math.max(Math.abs(velocity), Math.abs(recent)) >= DEFAULT_PULL_VELOCITY;
  const flickTrack = touch ? track : [...track, lifted];
  const speed = releaseVelocity(flickTrack, lifted.t);
  const flick = Math.abs(speed) >= CHAT_FLICK_VELOCITY;
  const travel = Math.abs(rise);
  return { tap: travel < TAP_SLOP && !quick, direction: (flick ? speed > 0 : rise > 0) ? "up" : "down", flick, quick, travel, y: end.y };
}

/** COM:11-13 OVERLAY_EASE as numbers. */
const OVERLAY_EASE = [0.22, 1, 0.36, 1] as const;

const bezier = (u: number, a: number, b: number) => 3 * (1 - u) * (1 - u) * u * a + 3 * (1 - u) * u * u * b + u * u * u;

/**
 * The share of a SHEET_EASE move's time at which it has covered `progress` of its way, so a row can be shown at the
 * moment the sheet's height lets it fit, as COA:310-333 revealWhileResizing does each frame.
 */
export function easedTimeAt(progress: number): number {
  const [x1, y1, x2, y2] = OVERLAY_EASE;
  const goal = clamp01(progress);
  if (goal === 0 || goal === 1) return goal;
  let [low, high] = [0, 1];
  for (let step = 0; step < 24; step++) {
    const middle = (low + high) / 2;
    if (bezier(middle, y1, y2) < goal) low = middle;
    else high = middle;
  }
  return clamp01(bezier((low + high) / 2, x1, x2));
}

/**
 * The header's opacity keyframes while the sheet's height eases from `from` to `to` over a SHEET_EASE move: hidden until
 * the sheet has `fit` of height for it, then shown over the next ROW_REVEAL (COA:281-295). Their offsets are already
 * times on that curve, so the animation that plays them runs linearly.
 */
export function revealFrames(from: number, to: number, fit: number): Keyframe[] {
  const [low, high] = [Math.min(from, to), Math.max(from, to)];
  const heights = [from, fit, fit + ROW_REVEAL, to].filter((height) => low <= height && height <= high);
  const at = (height: number) => (to === from ? 0 : easedTimeAt((height - from) / (to - from)));
  return heights.map((height) => ({ offset: at(height), opacity: rowReveal(height - fit), easing: "linear" })).toSorted((a, b) => a.offset - b.offset);
}
