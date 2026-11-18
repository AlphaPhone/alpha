# specs/quint/refinement/native/UpdateCompositionResidentPort.java
- Lines: 36 | Kind: Quint harness port (test double named `AlphaLocalAgentPlugin`: wraps the real upstream `CredentialShutdownLease` and exposes latches/counters) | Verdict: KEEP
- Covers: the resident-side `pauseForUpdate` / `updateShutdownConfirmed` / `releaseUpdateShutdown` calls the updater makes, with controllable stop confirmation and gates for the composition schedules. Duplicates: `test/fixtures/app-update-jvm/ai/alphacompute/alphaphone/AlphaLocalAgentPlugin.java` (the simpler stub used by the barrier/staging harnesses; `update-composition.mjs:18` excludes it so this one is compiled instead). Callers: `update-composition.mjs:27` (compiled list only); nothing else (`grep UpdateCompositionResidentPort` hits only that file).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-36 | C5 | Second `AlphaLocalAgentPlugin` stub next to the `app-update-jvm` one; the driver has to filter the other out by file name. | Merge: make the `app-update-jvm` stub carry the lease and gates (default no-op runnables) and drop this file plus the filter at `update-composition.mjs:18`. | Low |
| 2 | 15 | B4 | `pauseObserver` is `public` and `pauseRequested` a latch; check they are used (`UpdateFlowTest` uses `pauseRequested`). | Keep only members a harness reads. | Low |
| 3 | 7-9 | D11 | File name differs from the class it declares (allowed for non-public classes, but surprising). | Rename to `AlphaLocalAgentPlugin.java` in a port directory if not merged. | Low |

## Proposed end state
Folded into the single `app-update-jvm` `AlphaLocalAgentPlugin` stub, using the real `CredentialShutdownLease`.
