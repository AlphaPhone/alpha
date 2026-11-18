# scripts/stage-local-agent-runtime.ts
- Lines: 75 | Kind: build stage (npm `agent:stage-android`) | Verdict: KEEP, SIMPLIFY
- Covers: builds the mobile agent bundle from the prepared pinned source and stages the Android runtime payload, workflow worker, native view declarations and runtime marker into `android/app/src/main/assets/agent`. Duplicates: none. Callers: `package.json` `agent:stage-android` (part of `android:build:local`); comment refs in `product.gradle:14`, generated licence notices; listed in `quint-lib.ts:26`, `source-snapshot.ts:39`; tests `android-runtime-staging-selection.test.mjs` (imports `runtimeStagingSelection`; also T1 text read at :45-47), `one-runtime-profile.test.mjs:8,88` (imports `stagingArguments`, reads text), `android-build-path.test.mjs:216`, `mobile-uuid-build.test.mjs:49-50` (T1 regex).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13, 38-42 | A8 | `refuseRemovedProfileFlags` + exported `stagingArguments` exist for a removed flag and its test. | Inline `if (args.length) throw Error('Unknown option '+args[0])`; delete the export. | Low |
| 2 | 49, 59, 69 | P3 | `prepare-local-agent.ts --source-only` runs three times per stage (before, after the build, and again inside the spawned `stage-workflow-worker.ts`). | Run it before and after the build only; import `stageWorkerArtifact` from `workflow-worker-artifact.ts` instead of spawning `stage-workflow-worker.ts` (or give that script an exported function). | Low: the post-build check is the one that matters (build must leave source pristine). |
| 3 | 61-63 | D10 | Writes a temporary `.alpha-stage-runtime.ts` into the prepared source to call an upstream function under Bun. | `bun -e "<same import>"` with `cwd: source`, no file write into the immutable tree. | Low |
| 4 | 44-74 | D8 | Function body unindented; `function stageLocalAgentRuntime(){` wrapper exists only to guard the CLI. | Indent; keep the guard. | — |
| 5 | 71 | A8 (keep) | `alpha-runtime-profile.json` `{runtimeProfile:'native'}` is a one-value marker, but it is an APK asset read by upstream image admission (`stage-aosp-native.py:69` `profileEntry`) and `verify-packaged-runtime.py`. | Keep (crosses a process/package boundary, R8). | — |
| 6 | — | T1 | Three tests read this file's text. | Delete the text assertions; `android:build:local` + `verify-apks` exercise the stage. | Low |

## Proposed end state
~60 lines, one prepare check before and after the build, worker staged by import, no tombstone, no
temporary runner file in the prepared tree. `runtimeStagingSelection` stays exported with one test of the
ABI/Bun selection rules (it is the only risky pure logic here).
