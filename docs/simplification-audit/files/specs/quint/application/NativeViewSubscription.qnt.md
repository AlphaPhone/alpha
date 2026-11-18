# specs/quint/application/NativeViewSubscription.qnt
- Lines: 60 | Kind: Quint model (live, `specs/quint/application/manifest.json`) | Verdict: KEEP; PORT harness (whole-file transplant)
- Covers: live-only native renderer subscription: registration and subscription settle once, close removes the handle and retires dispatch, only matching frames deliver (`subscribeNativeViewEvents` in `apps/app/src/runtime/native-view-events.ts`). Duplicates: none. Callers/importers: `scripts/check-quint.ts` (scenarios + simulation, manifest family `application`); harness `native-view-subscription.mjs` via `test/quint-native-view-subscription.test.mjs` and `test/quint-application-refinement.test.mjs` (via `specs/quint/refinement/application/index.mjs`)

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness 73 | T2 | `sourceContext` transplant with a stubbed `crypto.randomUUID`. | Import the module (it takes a `NativeViewEventPort`, so no stubbing beyond the port is needed). | L |
| 2 | — | T4 | Runs twice. | Keep one runner. | L |

## Proposed end state
- Model unchanged; harness imports the module and passes a fake port.
