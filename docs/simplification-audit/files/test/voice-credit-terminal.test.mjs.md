# test/voice-credit-terminal.test.mjs
- Lines: 21 | Kind: transplant of upstream code (slices `NON_RECOVERABLE_SERVER_ERROR_CODES` and `handleServerFrame`..`startCapture` from `.eliza/.../voice-session-client-core.ts`, `vm`) | Verdict: DELETE
- Covers: `insufficient_credits`, `quota_exhausted`, `revoked` stop the shared voice client without recovery; others recover. Duplicates: upstream client tests; Alpha-visible billing failure is in `test/browser/billing-recovery.production.spec.ts` and `resident-failures.production.spec.ts` (`insufficient_credits`). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-12 | T2 | Two text slices of a generated upstream file. | Delete. | Low |
| 2 | 13-21 | T5 | Upstream behaviour (and only on the development realtime path in Alpha). | Delete. | Low |

## Proposed end state
File deleted.
