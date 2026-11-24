# test/browser-receipt-order.test.mjs
- Lines: 132 | Kind: transplant (T2; six text slices across `prototype/agent-adapter.ts`, `prototype/browser-adapter.ts`, `runtime/connection-ui.tsx`, run in `vm`; bundles `action-message-presentation.ts`; real `DeviceActions` via `test/fixtures/device-action-policy.mjs`) | Verdict: DELETE; REWRITE as `test/browser/journeys/browser.spec.ts` (agent-opened page) + one case in `journeys/chat.spec.ts`
- Covers: an approved agent "open URL" action journals, dispatches once, uploads its receipt and only then presents Browser; receipt failure shows "Not synced yet"; cancellation/journal failure/dispatch failure never present; presentation waits for the carrying chat request to settle and is dropped if the screen changed; the receipt message survives reopening and is idempotent; an ungrounded proposal (model repeated a URL) stays pending. Duplicates: `browser-navigation-creation.test.mjs` (same `navigate`/`browserNavigateApproved` slices); `direct-browser-grounding.test.mjs` and `browser-request-refusal.test.mjs` (grounding); Playwright `browser-external-handoff.spec.ts`, `journey-j05-web-research-note.spec.ts`. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 18-22, 94-100 | T2, T10 | Anchors include `"      if (!this.browserNavigateApproved) return"`, `'\n    });\n    context(this);'`, `'    if(shell.pendingActionApproval&&'`, `'\n    const blocked='`, `'function deliverRequestedActionReceipts('`, `'/** Coalesced reconnect/foreground-settlement'` (a doc comment), `'export function mergeConversationDelivery'`, and a 12-space-indented statement in `connection-ui.tsx` (one of the 81 slicers of that file). | Delete. | none |
| 2 | 12 | T9 | `ALPHA_RECEIPT_SOURCE_ROOT` env knob set by nothing. | Gone. | none |
| 3 | 41 | T3 | 13 operation predicates stubbed to `false`. | Gone. | none |
| 4 | 55-92 | T7 | 2 platforms x 2 origins x 12 cases = 48 generated tests over one harness. | Journey: web preview from Notes only, plus one native case. | low |
| 5 | 78-79, 115 | — | Two live regressions (chat request cancelled by presentation; duplicate reply line). Worth keeping as journey cases. | Carry. | none |

## Proposed end state
Delete. Journey cases (dev agent fixture proposes `browser_navigate`, bridge fake records `navigate`, dev receipt endpoint can fail):
1. approving "open example.com" opens Browser once on the new tab after the reply finishes; chat shows "Opened example.com." once and the reply is not "Stopped";
2. receipt upload failing shows "Not synced yet; open action history to retry." and Browser still opens once;
3. switching to Calendar before the reply settles: Browser does not take the foreground;
4. a reply that only repeats a URL leaves the proposal pending with no navigation (chat journey);
5. reopening the conversation shows the receipt line once.
`test/fixtures/device-action-policy.mjs` survives (5 other importers).
