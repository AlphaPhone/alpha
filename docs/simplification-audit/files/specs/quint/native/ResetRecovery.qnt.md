# specs/quint/native/ResetRecovery.qnt
- Lines: 201 | Kind: Quint model (live; imported by `ApplicationComposition.qnt:129-144`) | Verdict: KEEP; harness PORT (fixture source)
- Covers: device-credential approval bound to the Activity generation, durable budget before the pending marker, write-ahead attempt reservation under one owner, listener revocation before Android `clearApplicationUserData`, bounded automatic attempts with explicit user retry, accepted dispatch distinct from observed erasure. Duplicates: none (the composition imports it). Callers/importers: manifest; `ApplicationComposition.qnt` (exports `authenticate`, `attempt`, `beginReview`, `confirm`, `observeErased`, …); `refinement/native/reset-orchestration.mjs` (`index.mjs:178-183`); `ComponentTraces.java:221` (`ResetAuthorization` component).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness reset-orchestration.mjs:12-30 | T10 / T2 | The harness reads 18 Android port stubs out of `test/reset-startup.test.mjs` by regex (`put('<path>',\`...\`)`), asserts `ports.size === 18`, and evaluates each literal with `runInNewContext`. A formal harness depends on the text of a host test; if that test is deleted or reformatted (it is a candidate in the host-test review), the campaign breaks. Ports include `ai/eliza/auth/cloud/CloudSignInConfig`/`CloudKeyRevocation` stubs. | PORT: move the 18 port sources into `specs/quint/refinement/native/reset-ports/` (real `.java` files) and compile them directly; drop the regex/eval. | low |
| 2 | 67-73, 183-196 | A1? (no) | `loadLegacy` ("Restored v1 markers remain pending") reads like a legacy reader, but it models upstream `DataReset.failureState` (`vendor/.../DataReset.java:288-299`): a pending marker found at startup with a missing/corrupt/two-field budget counts as exhausted. That is upstream live code, not an Alpha legacy reader, so D1 does not delete it (D14). | Keep; rename to `restorePendingMarker` and fix the comment ("pending marker found at process start") when touching. | none |
| 3 | 42-50, 105-114 | — | `authenticate` ("Compatibility macro") and `attempt` ("Existing composition entry point") are macro actions kept for `ApplicationComposition`; the fine-grained `beginReview/confirm/authenticationResult/prepareBudget/persistMarker` and `beginAttempt/reserveAttempt/listenerResult/androidResult/finishAttempt` duplicate them. Both are in `step`. | Keep (composition needs the macros); reword comments to say "composition macro" rather than "compatibility". | none |
| 4 | 140 | B4 | `lateFailure = s' = s` is a stutter whose only purpose is a comment that no late write exists. | Keep only if the composition exports it (it does, line 144); otherwise fold into a comment. | none |
| 5 | manifest sources | — | `AlphaDataReset.java` is now 24 lines (product logic is upstream `DataReset`); manifest still lists it, correct as the Alpha wiring. | none | — |

## Proposed end state
Model unchanged (minor renames optional). Product code: `AlphaDataReset.java`, `ResetRecoveryActivity.java`,
`AlphaApplication.java`, `AlphaResetPlugin.java`, sense `ListenerControlProvider.java` and upstream `DataReset*` all
exist and are not on a delete list. The reset-orchestration harness owns its port stubs as files instead of
scraping them from a host test, so the host test's own verdict is independent of the formal layer.
