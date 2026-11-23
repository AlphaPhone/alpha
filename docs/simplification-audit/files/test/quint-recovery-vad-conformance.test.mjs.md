# test/quint-recovery-vad-conformance.test.mjs
- Lines: 10 | Kind: Quint refinement wrapper | Verdict: MERGE into `test/quint/refinement.test.mjs`
- Covers: RendererRecovery and VadSegmentation Quint traces agree with the native Java policies (`MainActivity`/`RendererRecoveryBudget` and upstream `ai/eliza/voice` VAD), compiled with javac by `specs/quint/native/recovery-vad-conformance.mjs`. Duplicates: Not in an aggregate. RendererRecoveryBudget is also run by `test/renderer-recovery-budget.test.mjs` (host-JVM fixture); renderer loss is also replayed by `quint-renderer-refinement` and `quint-renderer-background-rebuild`. Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job; also the `quint:conformance` npm alias (package.json:69), which only re-runs files `npm test` already runs..

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-9 | T4/P3 | Thin wrapper: calls one driver and pins receipt numbers (javaAssertions > 1000, transitions > 100). Exact counts break whenever the model or harness gains a scenario, and say nothing about product behaviour beyond "the replay passed". | Register the model in the manifest-driven runner `test/quint/refinement.test.mjs`; move the count/action floors into the manifest entry (or drop exact counts, keep "passed && driverInputsBound && inputsUnchanged"). | Low |
| 2 | driver 23-35 | helpers.md | The driver resolves `javac` from `JAVA_HOME` and hard-coded `/usr/lib/jvm` candidates: a fourth JDK lookup beside `test/fixtures/jvm-tools.mjs` and `refinement/native/java.mjs`. | Use `refinement/native/java.mjs` (or `jvm-tools.mjs`). | Low |
| 3 | package.json:69 | P5 | `quint:conformance` alias exists only to re-run four `test/*.test.mjs` files. | Delete the alias. | Low |

## Proposed end state
- Runner row for RendererRecovery and VadSegmentation; driver uses the shared Java helper.
- Decide with `renderer-recovery-budget` which one owns the budget arithmetic (Gradle JVM test or this replay), not both.
