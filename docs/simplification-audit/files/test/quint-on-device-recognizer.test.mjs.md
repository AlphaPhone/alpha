# test/quint-on-device-recognizer.test.mjs
- Lines: 19 | Kind: Quint wrapper (native index, javac) + a Java retirement probe (`probeRecognizerRetirement`) | Verdict: DELETE (fold the probe into the driver)
- Covers: on-device recognition keeps audio bounds and first-result authority; retired recognition errors keep availability; an active missing-language result demotes. Duplicates: native index runs `checkOnDeviceRecognizer`; `on-device-recognizer.mjs` already imports `recognizer-retirement.mjs`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-13 | T4 | Aggregate duplicate. | Delete. | None |
| 2 | 15-19 | — | Probe of real Java under three modes; not run by the aggregate. | Run it inside `checkOnDeviceRecognizer`. | Low |

## Proposed end state
Deleted; replay and probe run once from the native index.
