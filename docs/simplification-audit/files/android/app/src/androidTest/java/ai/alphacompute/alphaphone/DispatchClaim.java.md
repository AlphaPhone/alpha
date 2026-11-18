# android/app/src/androidTest/java/ai/alphacompute/alphaphone/DispatchClaim.java
- Lines: 11 | Role: test-side atomic queued/started/cancelled claim so a timed-out main-thread dispatch never runs later. | Verdict: MERGE into `android/app/src/androidTest/java/ai/alphacompute/alphaphone/TestUiDispatch.java`
- Importers: only `TestUiDispatch.java:10,14,15,20,24,26` (git grep across repo). Text/path pins: none — the `DispatchClaim` hits in `specs/quint/native/manifest.json`, `specs/quint/refinement/native/ActionRecoveryTraces.java` and `test/native-deletion-admission.test.mjs` are `DeletionDispatchClaim` / `nativeDispatchClaim`, different symbols.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-11 | D4 | Separate top-level file for an 8-line helper with one user | Make it a `private static final class Claim` inside `TestUiDispatch` (or inline the `AtomicInteger` state there) and delete this file | None |
| 2 | 5 | D9 | Magic ints `// 0 queued, 1 started, 2 cancelled` | Named constants `QUEUED/STARTED/CANCELLED` when merged | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `DispatchClaim` | class | 4-11 | none (upstream `DeletionDispatchClaim` is a different concept) | nested in `TestUiDispatch` |

## Proposed end state
File deleted; ~8 lines move into TestUiDispatch. 11 -> 0 lines here.

## Verification
`--classes UiDispatch` (`UiDispatchInstrumentedTest`) plus any default class (all use `TestUiDispatch` through `WebViewTestDriver`/`BoundedActivityScenario`).
