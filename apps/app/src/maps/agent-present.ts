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
  /** A call is ringing in: its answer screen is not replaced. */
  incomingCall?: unknown;
}>;

/**
 * Whether the launcher may bring Maps forward for the owner's own chat request. The owner
 * asks from the chat overlay over whichever app is open, so any app, Phone and Camera
 * included, is replaced by Maps exactly as the owner's own tap on Maps would replace it: a
 * call in progress keeps its ongoing-call bar and a recording keeps its chip. A locked,
 * hidden, shaded or sensitive screen, the assistant window, the connection sheet and a
 * ringing call keep the screen, and the phone says why Maps was not shown.
 */
export function agentMapsShowable(state: AgentMapsShellState | null | undefined): boolean {
  if (!state || !state.live || state.hidden || state.suspended || state.assistantSurface || state.connectionOpen) return false;
  if (state.screen !== 'home' || state.secure || state.shade || state.incomingCall) return false;
  return !state.view || typeof state.view === 'string';
}
