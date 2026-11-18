import type { Component as ReactComponent, PointerEvent as ReactPointerEvent } from 'react';
import type { ShadeSurface } from '@elizaos/capacitor-system/shade';
import type { MobileAssistantDetent, MobileShellNavigation, MobileShellNavigationAction } from '@elizaos/ui/mobile-shell/core';

/**
 * Types for the prototype shell in model.js (the `Component` class, its `api(k)` object and the
 * view definitions passed to `registerView`). They describe only what model.js and dc-lite.js
 * define. Fields an adapter attaches to the shell, to the api object or to a view's render output
 * belong to that adapter: it declares them in a local interface that extends these types.
 */

/** Per-view state: the view's `state` defaults merged with `S().vs[key]`. Adapters narrow it per view. */
export type ViewState = Record<string, unknown>;

/** The object a view's `render` returns, read by the template through `{{holes}}`. */
export type ViewOutput = Record<string, unknown>;

/** The object `renderVals()` returns: the template scope of the whole phone. */
export type RenderValues = Record<string, unknown>;

/** Chat states of the shell; "hidden" is the assistant pill. */
export type ShellChat = 'input' | 'hidden' | 'sheet' | 'full';

export type TimerId = ReturnType<typeof setTimeout>;

/** A target for opening a view from a chat card, a reply or a notification. */
export interface ViewTarget {
  view: string;
  patch?: ViewState | null;
  chat?: ShellChat | null;
}

/** A card attached to a chat message. `act` runs `VIEWS[mod].actions[fn]`; `go` opens a view. */
export interface ChatCard {
  type?: string;
  body?: string;
  done?: boolean;
  act?: { mod: string; fn: string };
  go?: ViewTarget;
  [key: string]: unknown;
}

/** One row of `S().msgs`. */
export interface ShellMessage {
  id: number | string;
  from: 'user' | 'agent';
  text: string;
  card?: ChatCard | null;
  /** Shown instead of `text` for an agent row when present. */
  displayText?: string;
  /** The conversation a user row belongs to; voice scroll-follow compares it. */
  messageBinding?: { conversationId?: string };
}

/** The shell's React state (`BASE` in model.js). `S()` returns it with the MVP view filters applied. */
export interface ShellState {
  screen: 'boot' | 'lock' | 'off' | 'home';
  bootStep: number;
  view: string | null;
  shade: boolean;
  chat: ShellChat;
  voice: 'off' | 'listening' | 'thinking' | 'speaking';
  vtext: string;
  vcap: string;
  draft: string;
  editCard: ShellMessage['id'] | null;
  typing: boolean;
  heads: boolean;
  toast: string;
  hint: boolean;
  /** Quick-settings facts (`wifi`, `bt`, `mic`, `plane`, `tileFacts`, …); a tile is neutral until known. */
  q: Record<string, unknown>;
  nGone: string[];
  nSlide: string | null;
  bright: number;
  theme: string | null;
  fs: boolean | null;
  now: number;
  charName: string;
  vs: Record<string, ViewState>;
  secure: boolean;
  stack: string[];
  toastUndo: boolean;
  drawer: boolean;
  drawerQ: string;
  msgs: ShellMessage[];
  /** Status line shown while `typing`; model.js reads it, an adapter writes it. */
  turnStatus?: string;
}

/** Props model.js and dc-lite.js read. */
export interface ShellProps {
  initial?: string;
  theme?: string;
  phoneOnly?: boolean;
  phoneSurface?: boolean;
  assistantSurface?: boolean;
  onCloseAssistant?: () => void;
  onReopenStartupAccess?: () => void;
  systemShell?: boolean;
  systemShade?: ShadeSurface;
  nativeSystemChrome?: boolean;
}

export interface ToastOptions {
  undo?: (() => unknown) | null;
}

export interface OpenViewOptions {
  /** Back's history: the current view stays on the stack. */
  push?: boolean;
  /** Do not reset the target's state (a view with ongoing work, or Back). */
  restore?: boolean;
  /** Return to the view exactly as it was left. */
  keepState?: boolean;
  /** The caller already set the stack. */
  keepStack?: boolean;
}

export interface ViewSetOptions {
  afterCommit?: () => void;
}

export interface SwipeOptions {
  /** Capture the pointer, and take gestures that start in the system zones. */
  capture?: boolean;
  /** A swipe along the other axis goes to the shell. */
  axis?: 'x' | 'y';
}

/** Pointer handlers from `sw()`. The handler returns false to pass the swipe to the shell. */
export interface SwipeBinding {
  down(event: ReactPointerEvent<Element>): void;
  up(event: ReactPointerEvent<Element>): void;
  cancel(): void;
}
export type SwipeHandler = (dx: number, dy: number) => unknown;

/** What a view's `reply`, or the shell's `reply`, answers to a typed or spoken request. */
export interface ViewReply {
  text: string;
  card?: ChatCard | null;
  nav?: string | ViewTarget | null;
  then?: () => void;
}

/** A Home/status-bar indicator for work that continues while the view is closed. */
export interface ViewOngoing {
  label: string;
  /** Key into `IC`. */
  icon: string;
  color?: string;
}

export interface ViewImmersive {
  dark?: boolean;
  noPill?: boolean;
  noStatus?: boolean;
}

export type ViewSuggestion = string | { label: string; go: () => void };

/**
 * The object `api(k)` returns to view `k`. `St` narrows the view's own state; `get` and `setView`
 * reach other views.
 */
export interface ViewApi<St extends ViewState = ViewState> {
  key: string;
  S: ShellState;
  st: St;
  ic: Readonly<Record<string, string>>;
  people: readonly ViewState[];
  person(id: string): ViewState | null;
  isActive(): boolean;
  now: Date;
  theme: 'light' | 'dark';
  name: string;
  active: boolean;
  secure: boolean;
  set(patch: Partial<St>): void;
  get<T extends ViewState = ViewState>(other: string): T;
  setView(other: string, patch: ViewState): void;
  shell(patch: Partial<ShellState>): void;
  /** Android only: shows the startup access panel again; null elsewhere. */
  reopenStartupAccess: (() => void) | null;
  open(view: string, patch?: ViewState | null, chat?: ShellChat | null): void;
  home(): void;
  toast(message: string, options?: ToastOptions): void;
  /** Timers that outlive the view (group `bg_<key>`). */
  everyBg(fn: () => void, ms: number): TimerId;
  laterBg(fn: () => void, ms: number): TimerId;
  stopBg(): void;
  chat(draft?: string): void;
  send(text: string): void;
  say(text: string, card?: ChatCard | null): void;
  sw(fn: SwipeHandler, options?: SwipeOptions): SwipeBinding;
  swallowed(): boolean;
  /** Timers that stop when the view is left (group `m_<key>`). */
  later(fn: () => void, ms: number): TimerId;
  every(fn: () => void, ms: number): TimerId;
  stop(): void;
  track(on: boolean): string;
  kx(on: boolean): number;
}

/** A view registered with `registerView(key, definition)` in model.js. */
export interface ViewDefinition<St extends ViewState = ViewState> {
  title: string;
  /** Key into `IC`. */
  icon?: string;
  aliases?: string[];
  /** Left out of the Settings notification list. */
  hidden?: boolean;
  /** Assistant rest state over the view; "hidden" (the pill) when absent. */
  chat?: 'input' | 'hidden';
  placeholder?: string;
  voicePhrase?: string;
  /** Default state; `vreset` starts from it. */
  state?: St;
  /** State keys that survive `vreset`. */
  persist?: string[];
  /** Development jump list: [preset sub-key or null, label]. */
  jumps?: Array<[string | null, string]>;
  preset?(sub: string, api: ViewApi<St>): Partial<St> | null | undefined | void;
  render(state: St, api: ViewApi<St>): ViewOutput;
  /** Returns a truthy value when the view handled Back itself. */
  back?(state: St, api: ViewApi<St>): unknown;
  onLeave?(api: ViewApi<St>): void;
  ongoing?(state: St, api: ViewApi<St>): ViewOngoing | null | undefined;
  immersive?(state: St, api: ViewApi<St>): ViewImmersive | null | undefined;
  badge?(state: St, api?: ViewApi<St>): boolean;
  suggestions?(state: St, api: ViewApi<St>): ViewSuggestion[];
  reply?(text: string, raw: string, api: ViewApi<St>): ViewReply | null | undefined;
  /** Settles state a patch from outside the view cannot coexist with, before `vpatch` applies it. */
  incoming?(state: St, patch: ViewState, api: ViewApi<St>): void;
  actions?: Record<string, (card: ChatCard, api: ViewApi<St>) => void>;
}

/** `VIEWS` from model.js. */
export type ViewRegistry = Record<string, ViewDefinition>;

/** Facts `pullContext()` returns for the Home shade-pull decision. */
export interface ShellPullContext {
  launcher: boolean;
  assistant: boolean;
  screen: ShellState['screen'];
  view: string | null;
  chat: ShellChat;
  voice: ShellState['voice'];
  drawer: boolean;
  secure: boolean;
  shade: boolean;
}

/**
 * The mounted shell (`this` in model.js, `shell`/`owner` in adapters). `St` lets an adapter add
 * the state keys it writes through `setState`.
 *
 * `vset` and `send` return `unknown`: model.js returns nothing, and adapters replace them with
 * versions that report a commit (`true`/`false`, or a promise of it).
 */
export interface ShellHost<St extends ShellState = ShellState> extends ReactComponent<ShellProps, St> {
  S(): St;

  /* timers; a group is cleared as one */
  later(fn: () => void, ms: number, group?: string): TimerId;
  clear(group: string): void;
  every(fn: () => void, ms: number, group: string): TimerId;
  stopEvery(group: string): void;

  /* toast */
  toast(message: string, options?: ToastOptions): void;
  showToast(message: string, options?: ToastOptions): void;
  scheduleToast(): void;
  holdToast(): void;
  resumeToast(): void;
  closeToast(): void;

  /* per-view state */
  vget<T extends ViewState = ViewState>(key: string): T;
  vset(key: string, patch: ViewState, options?: ViewSetOptions): unknown;
  vreset(key: string, patch?: ViewState | null): void;
  vpatch(key: string, patch: ViewState): void;
  api<T extends ViewState = ViewState>(key: string): ViewApi<T>;
  mod(key: string): Partial<ViewDefinition>;
  defaultChat(key: string): 'input' | 'hidden';
  rest(): 'input' | 'hidden';
  leave(): void;

  /* screens and navigation */
  preset(name: string): void;
  runBoot(): void;
  unlock(): void;
  power(): void;
  homeHint(): void;
  goHome(chat?: ShellChat): void;
  closeAssistant(): void;
  secureAdmits(secure: boolean, key: string): boolean;
  openView(key: string, patch?: ViewState | null, chat?: ShellChat | null, options?: OpenViewOptions): void;
  shellNav(): MobileShellNavigation;
  shellDetent(chat?: string | null): MobileAssistantDetent | undefined;
  shellNavigate(action: MobileShellNavigationAction): Pick<ShellState, 'view' | 'stack' | 'drawer' | 'drawerQ' | 'chat'>;
  back(): void;

  /* shade */
  simulatedShade(): boolean;
  openShade(): void;
  openSystemShade(): void;
  syncShadeFocus(): void;

  /* gestures */
  scale(element: Element): { r: DOMRect; s: number };
  gDown(event: ReactPointerEvent<Element>): void;
  gUp(event: ReactPointerEvent<Element>): void;
  swipe(start: { x: number; y: number; pull?: unknown }, dx: number, dy: number): void;
  pullContext(): ShellPullContext;
  sw(fn: SwipeHandler, options?: SwipeOptions): SwipeBinding;
  swallowed(): boolean;

  /* chat and voice */
  reply(raw: string): ViewReply;
  send(text?: string): unknown;
  agentSay(text: string, card?: ChatCard | null): void;
  cardAct(message: ShellMessage): void;
  startVoice(): void;
  stopVoice(): void;
  showHeads(): void;
  transcriptWindow(msgs: ShellMessage[], open: boolean): ShellMessage[];
  growChatWindow(list: Element | null): void;
  beginVoiceScrollFollow(): void;
  followVoiceTurn(conversationId: string, text: string): void;
  cancelVoiceScrollFollow(): void;

  /** The template scope; dc-lite.js renders the template from it. */
  renderVals(): RenderValues;

  /* hooks model.js reads and adapters provide */
  /** Asks Android to expand its notification shade (`systemShade === "android"`). */
  expandAndroidShade?: () => void;
  /** Truthy while the chat overlay animates; the transcript window stays open for it. */
  chatMotion?: unknown;
}

/** React lifecycle methods model.js defines; adapters wrap them on the prototype. */
export interface ShellLifecycle<St extends ShellState = ShellState> {
  componentDidMount(): void;
  getSnapshotBeforeUpdate(previousProps: Readonly<ShellProps>, previousState: Readonly<St>): null;
  componentDidUpdate(previousProps: Readonly<ShellProps>, previousState?: Readonly<St>): void;
  componentWillUnmount(): void;
}

/** `Component.prototype`: the object `install*Adapter` functions wrap. */
export type ShellPrototype<St extends ShellState = ShellState> = ShellHost<St> & ShellLifecycle<St>;

/** The `Component` class model.js exports. */
export interface ShellComponent<St extends ShellState = ShellState> {
  new (props: ShellProps): ShellHost<St>;
  prototype: ShellPrototype<St>;
}
