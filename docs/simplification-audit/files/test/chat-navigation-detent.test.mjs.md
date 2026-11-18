# test/chat-navigation-detent.test.mjs
- Lines: 71 | Kind: transplant (slices `openInternalView`…`context(shell:` from `agent-adapter.ts` and `goHome(chat) {`…`back() {` from `model.js`, `vm`-evals them in a fake `Shell`) | Verdict: DELETE; carry 3 cases to `journeys/chat.spec.ts`
- Covers: agent-requested navigation keeps the chat sheet/full detent; closing chat while the reply is pending does not reopen it; voice continuation picks its own detent; no success toast; an unconfirmed navigation shows "Could not confirm the screen change". Duplicates: `test/browser/browser-chat-overlay.spec.ts`, `chat-header-home.spec.ts`, `home-chat-anchor.spec.ts` (detent/overlay visible behaviour). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12-17 | T2/D7 | Two text slices across the two god modules being split (D1). | Delete. | None |
| 2 | 55-59 | T2 | "Regression control" mutates the sliced source with `replace("commit(chat==='sheet'…","commit()")` to prove the test fails: mutation testing on source text. | Delete. | None |
| 3 | 35-48, 66-71 | T3 | Visible behaviours worth a journey: ask the agent to open Notes with chat as a sheet -> Notes opens, sheet stays; close chat before the reply -> stays closed; unconfirmed delivery -> warning toast. | `journeys/chat.spec.ts` using the dev agent's navigation action. | Low |

## Proposed end state
Deleted. Three chat journey steps; the voice-continuation detent is covered by `chat-voice-mode.spec.ts` (voice journey).
