# test/resident-start-failure-policy.test.mjs
- Lines: 14 | Kind: Java transplant (brace-matched `startFailed` from `AlphaLocalAgentPlugin.java`) + source-text | Verdict: DELETE
- Covers: native start-failure classification (dead + known reason = failed; restarting/unknown pending); start path keeps updater fences. Duplicates: `specs/quint/refinement/native/resident-coordinator.mjs`, `resident-start-cancel.mjs`. Callers/importers: `npm test` glob; `jvm-tools.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-4 | T2 | Brace-matching slice of a Java method into a generated class. | Delete. | Low |
| 2 | 5-14 | T1 | `includes`/regex/count of `RuntimeUpdatePause.beforeStart();` occurrences in plugin and notification source. | Delete. | Low |

## Proposed end state
File deleted. Start classification is covered by the resident refinement and, on device, by the resident instrumentation.
