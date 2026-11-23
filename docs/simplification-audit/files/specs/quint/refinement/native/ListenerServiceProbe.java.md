# specs/quint/refinement/native/ListenerServiceProbe.java
- Lines: 29 | Kind: one-shot probe on vendored `ListeningService` (destroy after release / stop+release failure) | Verdict: DELETE (duplicate of `ListenerServiceTraces` scenarios `release-failure`, `both-failure`)
- Covers: destruction after a failed `AudioRecord.release` keeps the durable marker and microphone ownership, but unregisters callbacks, closes the engine, shuts the executor and calls `super.onDestroy`. Duplicates: `ListenerServiceTraces` runs `destroy(true,false)` and `destroy(false,false)` and observes the same fields (`microphoneHeld`, `marker`, `modes`, `recordings`, `playback`, `observer`, `executorShutdown`, `engineClosed`, `physical`, `released`, `superDestroyed`), checked against `NativeListenerService.qnt` `destroy`/`stopped()`. Only `threw` is extra (asserted false). Callers/importers: `listener-service.mjs` `probeListenerService` → `test/quint-listener-service.test.mjs` test 2 only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | T4 | Same scenarios refined field by field in the campaign. `threw==false` is implied: `ListenerServiceTraces.destroy` would propagate an exception and fail the campaign. | Delete this file, `probeListenerService` in `listener-service.mjs`, and test 2 of `test/quint-listener-service.test.mjs`. | low |

## Proposed end state
Gone; campaign scenarios `release-failure` and `both-failure` are the coverage.
