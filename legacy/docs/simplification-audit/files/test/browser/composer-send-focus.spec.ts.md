# test/browser/composer-send-focus.spec.ts
- Lines: 35 | Kind: Playwright UI with heavy prototype surgery, chromium | Verdict: **MERGE** into `journeys/chat.spec.ts` (4 cases)
- Covers: after Send (Enter or button) in the dock input, sheet and full detents the composer keeps focus and the next typed text; a late reply never steals focus; empty Enter, IME `isComposing` Enter and Shift+Enter do not dispatch; a background connection operation does not block a send; a foreground operation keeps the draft undispatched. Duplicates: `explicit-send.spec.ts` (Enter/IME rules), `chat-continuity.spec.ts` (busy states). Callers/importers: none. 10 tests (6 loop + 4).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5, 11 | P3 | Patches `Component.prototype.connectAgent`, wraps `Component.prototype.renderVals` to capture the shell, then patches the captured shell; replaces `alphaClient.send`. | Resident agent plugin that holds the reply until `agent.release()`. | Medium: the held reply is what makes the focus assertions meaningful. |
| 2 | 24, 29 | P3 | Overrides `connectionController.getSnapshot` to fake `busy`/`backgroundWork`. | Background case: hold `Agent.start` through the bridge (as `connection-boundaries.production` "automatic agent startup stays quiet" does). Foreground case: drop unless a visible foreground operation can be triggered. | Low. |
| 3 | 32 | P2 | Reads `shell.draftSendPending` (internal field). | Assert only the visible draft and the recorded sends. | none |
| 4 | 4 | A7 | `/?connections=advanced`: no reader of a `connections` query parameter exists in `apps/app/src` (grep for `connections=` and `get('connections'` found none). | Drop the parameter. | none |
| 5 | 13 | T4 | 3 detents × 2 methods = 6 boots for one rule. | Parametrise detent only (3), alternating method. | Low. |
| 6 | 3-35 | D8 | Minified one-line tests. | Rewritten in the journey. | none |

## Proposed end state
In `journeys/chat.spec.ts`: "Send keeps composer focus" (3 detents), "a late reply does not steal focus", "empty/IME/multiline Enter do not dispatch", "sending while the agent starts in the background is accepted". All on the resident harness; no prototype patches.
