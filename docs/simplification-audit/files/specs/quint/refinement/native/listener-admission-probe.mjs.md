# specs/quint/refinement/native/listener-admission-probe.mjs
- Lines: 15 | Kind: regression probe driver (runs `ListenerAdmissionProbe.java` on the real listener classes; not a model check) | Verdict: MERGE into `listener-service.mjs`
- Covers: listener service admission regression (one JVM run, no Quint comparison). Duplicates: compiles exactly the same ten classes + ports as `listener-service.mjs` (`compiled()` there); `probeListenerService` already lives in that file. Callers/importers: `test/quint-listener-service.test.mjs:4,32`; mentioned in `README.md`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11 | C5 | Duplicates the ten-name source list of `listener-service.mjs:9` and `listener-input.mjs:13`. | Export `listenerSources(platform)` once from `listener-service.mjs` and add `probeListenerAdmission` there. | None |
| 2 | 15 | A7 | CLI block. | Optional. | None |

## Proposed end state
`probeListenerAdmission` is a five-line export of `listener-service.mjs`; this file is deleted.
