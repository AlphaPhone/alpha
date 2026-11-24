# test/quint-listener-service.test.mjs
- Lines: 39 | Kind: Quint wrapper (javac replay, native index) + two Java failure-injection probes (`probeListenerService`, `probeListenerAdmission`) | Verdict: DELETE (fold both probes into the driver)
- Covers: listener/service lifecycle keeps failed resources and completes destruction; release failure keeps uncertainty while retiring callbacks; failed durable admission cannot arm recognition. Duplicates: native index runs `checkListenerService`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-13 | T4 | Aggregate duplicate (360 s, javac). | Delete. | None |
| 2 | 15-39 | — | Two probes compile and run the real (patched upstream) `ListeningService`/`Listener` Java under injected failures; the aggregate does not run them. | Run them from `checkListenerService` (or as Gradle JVM tests of the patched sense module). | Low |
| 3 | — | P1 | Model sources are upstream sense Java patched by `scripts/prepare-patched-native.ts`. | Select on `upstream.lock.json` or patch changes. | Low |

## Proposed end state
Deleted; replay and probes run once from the native index.
