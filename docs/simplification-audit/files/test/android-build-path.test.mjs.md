# test/android-build-path.test.mjs
- Lines: 247 | Kind: tooling integration (real `android-build-preflight.ts` functions on a temp checkout with a git-initialised `vendor/eliza`; spawns real `scripts/build-android.ts` in a copied tree; real `ensurePreparedWorkflowWorker`) + source-text (package.json chain, `stage-local-agent-runtime.ts` order) | Verdict: KEEP, trimmed; MERGE into `test/tooling/android-build.test.mjs`
- Covers: `npm run android:build` stops with exit 2 before Gradle and names the command for each missing input (voice outputs, prepared source, worker, profile marker, embedding host, stale Google host, unpinned vendor); worker artifacts are reused only when they match the prepared source. This is the AGENTS.md "exits 2 before Gradle" contract. Duplicates: `test/one-runtime-profile.test.mjs` (removed-flag refusal), `test/android-consumer-build.test.mjs:96-97` (same refusal). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 57-139, 221-247 | - | Real preflight against synthetic checkouts: release-gating tooling. | Keep. | High if dropped |
| 2 | 141-164 | - | Spawns the real `build-android.ts` in a copied tree, proves exit 2 and no `artifacts/`: the best test in the file. Copies 15 scripts by hand list (line 146), which breaks on any new import. | Keep; copy `scripts/` wholesale or run against the fixture root via an env/root option. | Medium |
| 3 | 156-162 | A8, T4 | Removed-flag refusal loop (`--runtime-profile`, `--local-embeddings`) tests `removed-profile-flags.ts`, which the scripts research marks DELETE (tombstone). Also in `android-consumer-build` and `one-runtime-profile`. | Delete the loop with the refusal code. | None |
| 4 | 190-219 | T1 | Asserts the exact `android:build:local` chain string in package.json and `indexOf` order inside `stage-local-agent-runtime.ts`. | Delete; the chain is exercised by running it (CI resident-android lane). | Low |
| 5 | 18-29 | T3 | Tests that `preparedSourceEnv` strips AI-agent detection env vars using a fake turbo updater. | Fold into a one-line assertion on `preparedSourceEnv` output or drop. | Low |
| 6 | 109-116 | B4 | Saves/restores `process.env` by hand; the preflight should take these paths as options. | Pass options. | Low |
| 7 | 8-14 | - | Imports eight script modules; slow to load but no spawns except the build. | - | - |

## Proposed end state
`test/tooling/android-build.test.mjs` holds the preflight cases (missing voice outputs, missing prepared source, stale
worker/profile/Google host, missing embedding host, unpinned vendor exits 2 before Gradle) and the worker reuse case, on one
fixture-checkout helper shared with `android-host`, `android-consumer-build` and `android-runtime-staging-selection`.
Text pins and tombstone refusals removed.
