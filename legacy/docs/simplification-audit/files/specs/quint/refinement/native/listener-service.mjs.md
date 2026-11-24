# specs/quint/refinement/native/listener-service.mjs
- Lines: 26 | Kind: Quint refinement driver (real shared listener/service/store/lease classes, 14 scenarios) + `probeListenerService` regression | Verdict: KEEP (absorb `listener-admission-probe.mjs`)
- Covers: listening-service lifecycle: marker write failure, repeated start, release/stop failures, paused/disabled, retained handle refusal/retry, reopen, late start, destroy/pause during asset loading; model `NativeListenerService` (native manifest, live; D7). Callers/importers: `test/quint-listener-service.test.mjs`, native aggregate `index.mjs:31,191` (T4); README.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9 | C5 | Ten-class list duplicated in two siblings. | Export it from here. | None |
| 2 | 11 | D8 | `probeListenerService` on one line. | Formatter. | None |
| 3 | — | P6 / T4 | Upstream code; aggregate duplicate. | Path filter; aggregate goes. | None |

## Proposed end state
Exports `listenerSources`, `checkListenerService`, `probeListenerService`, `probeListenerAdmission`; one runner.
