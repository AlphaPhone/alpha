# specs/quint/refinement/native/update-staging.mjs
- Lines: 240 | Kind: Quint refinement harness: Java via `exactUpdateMembers` slice + **renderer source transplant** (T2/T10) | Verdict: PORT
- Covers: model `NativeUpdateStaging` (live) — Settings update manifest review and cache cadence (renderer) joined with native download, digest/archive admission, cache reuse/sweep and boot-time admission. Duplicates: `test/quint-native-update-staging.test.mjs` (T4); `test/app-update.test.mjs` covers native download deadline separately. Callers/importers: `index.mjs`, that test.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 53-65 | T2/T10 | `settingsProgram` reads `apps/app/src/prototype/settings-adapter.ts` and slices `'export const UPDATE_SCHEMA'`→`'/** Field updates wait for Home'` and `'const UPDATE_KEY'`→`'/** Keep the reference settings components'`, asserts `parseUpdateManifest(` and `device.checkForUpdate()` substrings, strips types, evaluates in `vm` with a fake `device`, `localStorage`, `Capacitor`, `Date`. Anchors exist today (settings-adapter l.153, 220, 272, 347). | The structural plan moves update-manifest policy (L135-228, 272-296) to `runtime/app-update.ts`. Export there: `parseUpdateManifest`, `updateCheckDue` (already exported), `checkForUpdate`, and a read-only `updateCacheState()` (`{cache: savedUpdate(), checking}`), with the device plugin imported from the typed `native/` module. Harness loads it with the shared `loadProductModule` and stubs the device module + `@capacitor/core`; localStorage/Date via globals. | M |
| 2 | 165 | T10 | Java side uses `exactUpdateMembers`. | Compile `AppUpdater.java` after U-A1. | M |
| 3 | 67-147 | – | The renderer driver observes real cache bytes, joined promise, cadence and withdrawal: valuable integration-style coverage. | Keep (rebased on the import). | – |
| 4 | 172-184 | – | Asserts native manifest-fetch outcomes and deadline probes before using them: real oracles. | Keep. | – |
| 5 | 8,156 | C7 | Depends on `test/support/strip-types.mjs` only for the transplant. | Drop with the port. | L |
| 6 | – | runtime | 9 manifest + 1 deadline + 20 mode JVM runs after one javac; the heaviest native update campaign. | Keep; lane-scope it. | – |

## Proposed end state
Imports `runtime/app-update.ts` instead of slicing Settings; compiles `AppUpdater.java`; same traces and assumptions.
Lane: `runtime/app-update.ts` (+ bundle inputs), `update/**`, `test/fixtures/app-update-jvm/**`, journal/transport upstream.
