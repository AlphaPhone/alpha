# test/checkin-choice-presentation.test.mjs
- Lines: 53 | Kind: unit (imports real `runtime/action-message-presentation.ts`) + transplant (lines 32-52 slice `restoredMessages(` from `connection-ui.tsx` and a render region of `model.js`) | Verdict: MERGE lines 15-31 into `test/action-message-presentation.test.mjs`'s successor (chat integration) or `journeys/chat.spec.ts`; delete 32-52
- Covers: a LifeOps check-in's trailing `[CHOICE:…]` block is hidden only for service-authored rows; user/quoted/malformed/ambiguous text is preserved; the original text is kept for copy/reply. Duplicates: `test/action-message-presentation.test.mjs` (same module; system-notice projection), `test/browser/chat-system-notices.spec.ts` (notice rendering). No browser spec seeds a check-in row (grep `lifeops-checkin` in `test/browser`: none). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 32-43 | T2 | Slices `restoredMessages` between `function restoredMessages(` and a doc-comment `/** Eliza Cloud's API`. | Delete. | None |
| 2 | 44-51 | T2 | Evaluates a raw region of `model.js` (`var msgs = this.transcriptWindow(` … `var baseSug =`) with positional fake arguments. | Delete. | None |
| 3 | 15-31 | T3 | Parser over hostile input (quoted, fenced, trailing prose, mismatched ids): a security-relevant projection with no journey coverage. | Add one `journeys/chat.spec.ts` step: dev agent history includes a check-in row and a user row with the same text -> check-in shows prose only, user row shows the full text. Keep the hostile-input table only if the owner accepts a pure-parser exception. | Low |

## Proposed end state
Transplant part deleted. Visible check-in presentation in the chat journey; the hostile-input table either joins the
one surviving presentation test or goes.
