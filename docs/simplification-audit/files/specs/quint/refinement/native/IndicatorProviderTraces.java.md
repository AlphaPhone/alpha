# specs/quint/refinement/native/IndicatorProviderTraces.java
- Lines: 93 | Kind: Quint refinement harness (real staged `IndicatorLeaseProvider`, `IndicatorLease`, `ListenerPolicy`; Android identity/Binder/clock as ports) | Verdict: KEEP (gate on upstream changes)
- Covers: SystemUI indicator lease provider: acquire/replace, unlink failure, same/dead token, revoke, expiry, boot change, invalid calls, every caller-identity denial (permission, signature, package, shared uid, user, low uid, missing package), report classes (visible, hidden, AOD, fullscreen, shade, transition, unknown). Duplicates: none in host tests (test 3 of `test/quint-indicator-provider.test.mjs` is a separate source-text check of `build.gradle`/`consumer.gradle`, T1). Callers/importers: `indicator-provider.mjs` `checkIndicatorProvider`, native aggregate, `test/quint-indicator-provider.test.mjs`.
- Model live: `NativeIndicatorProvider`; models only vendored upstream code (research §2.9 "upstream modelled in the consumer").

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 86-92 | C3 | `main("campaign", …)` re-spawns itself per scenario with `ProcessBuilder`; `java.mjs` already has `javaTraceCampaign` (one JVM per argument set). Same pattern in `ListenerServiceTraces`, `ListenerStoreTraces`, `LiveCaptureTraces`, `MainActivityRecoveryTraces`. | Drop the in-Java campaign branch; driver calls `javaTraceCampaign(harness, inputs, scenarios.map(s=>[s]), main)` (as `ListenerInputTraces` does). | low |
| 2 | 21-25, 28-37 | T10 | Reads private fields of upstream `IndicatorLease` (`generation`, `live`, `acknowledged`, `expiresAt`, `boot`, `surfaceVisible`, `chipVisible`, `recordingObserved`, `display`, `reason`, `lastLoss`) and provider (`linkedToken`, `linkedRecipient`). An upstream rename breaks it; only reachable on a pin bump. | Keep; gate the job on upstream pin/patch changes so it runs exactly when it can break. | low |
| 3 | — | P1/P6 | Runs on every PR although its inputs only change with `upstream.lock.json` / native patches. | Path filter: `upstream.lock.json`, `android/upstream-native-sources.json`, `patches/eliza/**`, `android/sense/**`, the model, this directory. | — |

## Proposed end state
Same 27 scenarios, launched by `javaTraceCampaign`; no self-spawning `main`. Runs only on upstream/sense/patch changes. Long-term owner option: move model and harness upstream with the sense module.
