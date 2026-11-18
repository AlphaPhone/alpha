# test/strict-build-inputs.test.mjs
- Lines: 187 | Kind: tooling (imports `scripts/build-embedding-host.ts` and `scripts/android-build-preflight.ts` with injected builders; spawns `prepare-embedding-host.ts` and the real preflight on the checkout) | Verdict: KEEP (trim; move embedding cases to `test/embedding-host-admission.test.mjs`)
- Covers: The strict distribution build input report separates script-produced from person-supplied inputs without leaking signing values, and the embedding host is staged only as an exact reproduction of the reviewed bytes. Duplicates: `test/embedding-host-admission.test.mjs` also imports `run`/`stagedLibraries` from `build-embedding-host.ts`. Callers/importers: `npm test` glob; scripts called by `npm run android:build:inputs`, `android:build:local`, `agent:build-embedding-host`, `.github/workflows/resident-android.yml`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 31-105 | C5 | Embedding staging cases live apart from the other embedding-host admission tests. | Move to `embedding-host-admission.test.mjs`. | Low |
| 2 | 107-121 | T1 | Regexes `prepare-embedding-host.ts` / `build-embedding-host.ts` text (`const remapEnv=remap?embeddingBuildRemap(root,`). | Delete the regexes; keep the spawned "Unknown option" check. | Low |
| 3 | 170-187 | B5/T8 | Runs the real preflight against the developer checkout and pins the exact 9-row order; result depends on local state. | Keep the exit-code and "never ready while records say otherwise" assertions; drop the exact row list. | Low |
| 4 | 13-14 | C3 | Local `sha`/`readJson` helpers (readJson unused). | Remove unused helper. | Low |

## Proposed end state
Rename to `test/android-build-preflight.test.mjs` with tests 5-6; embedding cases join `embedding-host-admission.test.mjs`.
