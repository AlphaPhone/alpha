# test/workflow-worker-assets.test.mjs
- Lines: 109 | Kind: tooling (test 1: real `scripts/workflow-worker-artifact.ts` staging and verification on a real temp tree built by `fixtures/workflow-worker-assets.mjs`) + host-JVM integration (test 2: javac of real `WorkflowWorkerAssets.java` with an inline 50-line Java harness held in a JS template string) | Verdict: KEEP, split: test 1 MERGE into `test/tooling/workflow-worker.test.mjs` (with `prepared-workflow-worker.test.mjs`); test 2 move to a Gradle JVM test
- Covers: worker artifact staging rejects drift, patched overlays, traversal, missing files, symlinks and oversize before replacing the staged copy; the native extractor verifies bytes, skips unchanged installs, repairs damage, sweeps leftovers and keeps the previous install on corruption. Duplicates: Quint `specs/quint/refinement/services/workflow-worker-staging.mjs` (imports the same fixture), `test/prepared-workflow-worker.test.mjs`, `test/android-build-path.test.mjs`. Callers/importers: `npm test` glob; `fixtures/workflow-worker-assets.mjs` (also imported by the Quint refinement, so it survives), `fixtures/jvm-tools.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-38 | keep | Release-gating tool exercised on a real filesystem. | Merge per tool family. | Low |
| 2 | 44-95 | T9/C7 | Java test source embedded in a JS template string (with `${'a'.repeat(64)}` interpolation inside Java). | Move to `android/app/src/test/.../WorkflowWorkerAssetsTest.java` (JUnit, temp dirs via `@TempDir`/`TemporaryFolder`). | Low |
| 3 | 56-58 | A1? | Asserts a "legacy in-tree package stamp" (`.installed-package`) is removed on install: cleanup of a layout from earlier builds. Under D1 (fresh package, no prior installs) the product sweep may be removable. | Owner of `WorkflowWorkerAssets.java` decides; drop the assertion with the sweep. | Low |
| 4 | 99-107 | T9 | Real-artifact branch runs only when `ALPHA_WORKFLOW_WORKER_OUTPUT` is set; `resident-android.yml` exports it, but whether that job runs host tests is not established. | In Gradle, run against the staged artifact when present as a separate, explicitly named check. | Low |

## Proposed end state
Test 1 lives in `test/tooling/workflow-worker.test.mjs`; test 2 is a JUnit test beside the Java class; this file is deleted. The fixture stays (Quint refinement imports it).
