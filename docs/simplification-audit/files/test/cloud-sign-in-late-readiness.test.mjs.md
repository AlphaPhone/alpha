# test/cloud-sign-in-late-readiness.test.mjs
- Lines: 64 | Kind: source transplant (slices `inAppSignInMethods`, `beginSignIn` and `manageProviderKey` out of `connection-ui.tsx`, wraps them in a hand-written closure of ~25 fake globals, esbuild-transforms and evals) plus one source-text case | Verdict: DELETE
- Covers: a native sign-in readiness answer that arrives after the 6 s email-fallback deadline is adopted only by the same chooser; abort, epoch, close, account, environment, chooser/step change, a new operation or a provider-key action retire it; negative/malformed/rejected late answers never enable Google. Duplicates: `test/cloud-sign-in-readiness-retry.test.mjs` (same two slices), `test/cloud-sign-in-state.test.mjs` (`beginSignIn` slice). Callers/importers: `npm test` glob; honours `ALPHA_READINESS_SOURCE` env knob nothing sets.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-9, 12-33 | T2 / D7 | Three marker slices plus a fake module scope that must name every free variable the slices use; any new reference breaks it. | Delete. | Medium: the late-readiness fence has no other test. |
| 2 | 52-57 | T1 | Counts `operation = controller;` occurrences (must be 4) and the 45 characters before each; pins `SIGN_IN_READINESS_WAIT_MS = 6000`. | Delete. | None |
| 3 | 5 | T9 | `ALPHA_READINESS_SOURCE` override is unused. | Goes with the file. | None |

## Proposed end state
Deleted. When the connection-ui split (stage F) gives sign-in readiness its own module with an injected clock and status port, the cases "late positive adopted by the same chooser" and "retired after abort/epoch/chooser change" become two cases of `test/integration/connection-cloud.test.mjs`. Until then the rendered effect (Google appears late in the same chooser) can be one step in `journeys/connection-cloud.spec.ts` with a delayed native `status` answer.
