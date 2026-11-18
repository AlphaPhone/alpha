# test/connection-recovery-state.test.mjs
- Lines: 141 | Kind: transplant (eight `section()` slices of `connection-ui.tsx`, plus a regex over `vendor/eliza/packages/contracts/src/contracts/chat.ts` to extract `CHAT_FAILURE_KINDS`, and `new Function` over the `REPLY_FAILURES` literal) | Verdict: DELETE (carry two cases)
- Covers: required sign-in page only after a refused sign-in while offline; every upstream chat failure kind maps to owner copy (`replyFailure`); restored failure rows show static copy; an action refused before reservation is not cached; edit release runs the queued rebind; transient native identity reads retry once. Duplicates: `connection-presentation-state.test.mjs:69-87, 873` (sign-in gate), `conversation-restore-safety.test.mjs:68-86` (`restoredMessages`, same slice), `test/browser/connection-startup-presentation.spec.ts`. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11, 14 | T1 / T5 | Reads `vendor/eliza` contract source and regex-parses the `CHAT_FAILURE_KINDS` array instead of importing `@elizaos/contracts`. | Import the constant. | Low |
| 2 | 17-141 | T2 | All behaviour runs on slices; breaks on any reorder or comment edit. | Delete. | Low |
| 3 | 44-58 | — | "Every upstream failure kind has owner copy, unknown kinds stay generic" is a real contract that guards an upstream pin bump adding a kind. | Keep as one table case in `test/integration/connection-cloud.test.ts` importing `REPLY_FAILURES` and `replyFailure` (needs `replyFailure` exported or moved to a `reply-failures.ts` module) and the real `CHAT_FAILURE_KINDS`. | Medium |
| 4 | 128-141 | — | Transient identity read (0/408/429/5xx) retried once, 401/403 not. | Same integration file, once `transientIdentityRead` is importable. | Low |
| 5 | 76-91 | T4 | `restoredMessages` duplicate of `conversation-restore-safety.test.mjs:68-86`. | Drop here. | Low |

## Proposed end state
File deleted. Rows 3–4 become two cases of `test/integration/connection-cloud.test.ts` over an extracted
`runtime/reply-failures.ts` (pure, imports `CHAT_FAILURE_KINDS` from contracts). Sign-in gating stays with
`journeys/connection-cloud.spec.ts` (production project).
