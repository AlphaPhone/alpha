# test/renderer-recovery-budget.test.mjs
- Lines: 22 | Kind: host-JVM test (real `RendererRecoveryBudget.java`) + source-text | Verdict: MERGE test 1 into Gradle `android/app/src/test/java/.../RendererRecoveryBudgetTest.java`; DELETE test 2
- Covers: Renderer loss budget, backoff, escape while HOME, background reclaim deferred and uncounted (AP-02). Duplicates: `quint-recovery-vad-conformance` (RendererRecovery model vs the same Java), `quint-renderer-refinement`, `quint-renderer-background-rebuild`. Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job; fixture `test/fixtures/RendererRecoveryBudgetTest.java`..

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-11 | D | Real class plus a Java fixture compiled with `runJvm`. | Move the fixture into the Gradle unit-test source set. | Low |
| 2 | 13-22 | T1 | Six regexes over `MainActivity.java` (call shape, statement order, field modifier, `extends MainActivity`). | Delete. | Low |

## Proposed end state
- One Gradle JVM test class; the Quint conformance remains the trace-level check.
