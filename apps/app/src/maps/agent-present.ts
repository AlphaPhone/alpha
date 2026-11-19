/** The launcher state an agent Maps request is checked against before Maps is brought forward. */
export type AgentMapsShellState = Readonly<{
  live: boolean;
  hidden: boolean;
  suspended: boolean;
  assistantSurface: boolean;
  connectionOpen: boolean;
  screen?: unknown;
  secure?: unknown;
  shade?: unknown;
  view?: unknown;
}>;

/** Views an agent request never replaces: a camera capture or the dialer may be mid-use. */
const KEPT_VIEWS: ReadonlySet<string> = new Set(['camera', 'phone']);

/**
 * Whether the launcher may bring Maps forward for the owner's own chat request. The owner
 * asks from the chat overlay over whichever app is open, so an app such as Browser is
 * replaced by Maps exactly as the owner's own open would. A locked, hidden, shaded or
 * sensitive screen, the assistant window, the connection sheet and a camera or dialer view
 * keep the screen, and the phone reports that Maps could not be shown.
 */
export function agentMapsShowable(state: AgentMapsShellState | null | undefined): boolean {
  if (!state || !state.live || state.hidden || state.suspended || state.assistantSurface || state.connectionOpen) return false;
  if (state.screen !== 'home' || state.secure || state.shade) return false;
  return !state.view || typeof state.view === 'string' && !KEPT_VIEWS.has(state.view);
}
