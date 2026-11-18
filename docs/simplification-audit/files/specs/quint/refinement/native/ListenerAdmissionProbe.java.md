# specs/quint/refinement/native/ListenerAdmissionProbe.java
- Lines: 31 | Kind: one-shot probe on vendored upstream `ListeningService` (failed durable open-session write) | Verdict: DELETE (duplicate of `ListenerServiceTraces` scenario `marker-write-failure`)
- Covers: when the durable `captureSessionOpen` commit fails, recognition is not armed, no engine loads, no capture, marker in memory only, one stop request. Duplicates: `ListenerServiceTraces` scenario `marker-write-failure` drives the same `onStartCommand` with `StorePorts.preferences.outcome="memory-failure"` and observes every field this probe prints (`storageFailed`, `marker`, `durableMarker`, `epochActive`, `analyse`, `capture`, `enginePresent`, `physical`, `released`, `stopRequests`) against `NativeListenerService.qnt` action `markerWriteFailed` (model lines 40-45). Callers/importers: `listener-admission-probe.mjs` → `test/quint-listener-service.test.mjs` test 3 only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | T4 | Same behaviour, same source, already refined field by field against the model. | Delete this file, `listener-admission-probe.mjs` and test 3 of `test/quint-listener-service.test.mjs`. | low |

## Proposed end state
Gone. The `marker-write-failure` trace in the listener-service campaign is the coverage.
