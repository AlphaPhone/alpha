# test/core-state-patch.test.mjs
- Lines: 154 | Kind: tooling (imports `scripts/core-state-patch.ts`, `combined-agent-source.ts`, `build-policy-source.ts`; real temp dirs, real `git init/commit`, real `bun --preload` runs, one `python3 -c runpy` read of `scripts/verify-packaged-runtime.py`) + one source-text test | Verdict: KEEP (MOVE to `test/tooling/upstream-sources.test.ts`); DELETE test 6
- Covers: the reviewed core-state manifest is read without changing bytes; wrong digest/pin/target/symlink/program fail closed; the esbuild onLoad interception binds the exact source and records observations; the Bun preload refuses source drift; frozen snapshots keep their own guard; each producer observes exactly its selected targets; the Python APK verifier's target list equals the manifest. Duplicates: the research table classified this as "Python unittest" (bucket F); that is wrong: only test 2 calls Python, to read one constant. Callers/importers: `npm test` glob; `test/fixtures/core-state-root.mjs` (also imported by 9 `specs/quint/refinement/services/*-launcher*.mjs` harnesses and `test/android-build-path.test.mjs`, so it survives).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 24-34, 46-72, 118-154 | — | Real script against real fs; gates what upstream source reaches the APK and launchers. Release-relevant tooling. | Keep. | — |
| 2 | 73-106 | — | Spawns `bun` four times (`ALPHA_BUN`); the most expensive part (~seconds) and the only end-to-end proof of the preload. | Keep; mark as needing bun in the tooling lane. | Low |
| 3 | 35-45 | C7 | Cross-checks the TS manifest with a Python constant via `runpy`: symptom of two languages for one job (`verify-packaged-runtime.py`). | Keep while the Python verifier exists; delete when it is ported to TS (scripts review). | Low |
| 4 | 107-116 | T1 | Regex that five launcher scripts contain `coreRuntimeArguments(root,source,[` and `ALPHA_CORE_STATE_SOURCE:source`. Includes `start-local-remote.ts` (dev) and `cloud-resident-host.ts`. | Delete. Launchers that forget the preload fail the launcher refinement probes (`*-launcher-probe.mjs`) that already import `core-state-root`. | Low |

## Proposed end state
Moves to `test/tooling/upstream-sources.test.ts` with tests 1–5 and 7–8 unchanged; test 6 deleted. Runtime is dominated by
the bun spawns; run in the tooling lane only when `scripts/core-state-*`, `scripts/combined-agent-source.ts`,
`scripts/build-policy-source.ts` or the core-state manifest change.
