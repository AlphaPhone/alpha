# specs/quint/application/StartupPermissions.qnt
- Lines: 55 | Kind: Quint model (live: manifest, 5 scenarios, single `safety`) | Verdict: KEEP, SIMPLIFY (delete the legacy upgrade action and scenario, D1)
- Covers: the startup permission flow (`createStartupPermissionFlow`): one prompt per attempt, retained attempt across restart with best-effort storage, pending ownership, and walkthrough step progress. Duplicates: `test/quint-conformance.test.mjs:64-95` (two tests replaying `denialRestartTest`/`failedStorageRestartTest` against the same module as `portable.mjs`); host tests `test/startup-permission-completion.test.mjs`, `test/startup-access-flow.test.mjs`; Playwright `test/browser/startup-access.spec.ts`. Callers/importers: manifest; harness `refinement/application/portable.mjs:9-41` (`startupPermissions`, imports the real module via `sourceModule` esbuild bundle) in the aggregate `index.mjs:115`; `test/quint-conformance.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 31-34, 43, 54 | A1 | `oldCompletedInstall`, `CompletedUpgrade` and `upgradeTest` model "completed historical installations stay completed" — walkthrough versions 1-3 in `startup-permission-progress.ts:4-14` (`{1:…, 2: 5, 3: 6, 4: …}`). PATTERNS A1 / D1 name "historical permission-walkthrough versions" as a legacy reader to delete: the package starts with empty data. | Delete the action, invariant and scenario; remove `upgradeTest` from the manifest `tests` (manifest line ~128) in the same commit as the product drops versions 1-3. | Low |
| 2 | 24-27 | — | `step < 7` matches `nativeStartupPermissionKeys.length` (7) today; it is a literal. | Keep; note it must change if the native list changes. | Low |
| 3 | harness | — | `portable.mjs` imports the real flow and covers prompt/restart/storage; it never drives `persistNext`/`persistFailed` (progress). Progress is modelled but unrefined. | Optional: extend the harness with progress writes through `writeStartupPermissionProgress`, or accept. | Low |
| 4 | test | T4 | `test/quint-conformance.test.mjs:64-95` re-checks two scenarios already replayed by `portable.mjs`. | Delete those two tests. | Low |
| 5 | 1, 35, 26 | — | `resumeDuringPrompt` and `persistFailed` are identity steps (`s' = s`) kept as named events for scenarios; harmless. | None. | — |
| 6 | manifest | — | Manifest `sources` list `startup-permissions.tsx`, `startup-browser-permissions.ts`, `aosp-image.ts`; harness reads only `startup-permission-flow.ts`. `startup-browser-permissions.ts` is slated for the browser/dev boundary (cross-file-actions §323). | Update `sources` when files move. | Low |

## Proposed end state
About 45 lines: prompt, restart and progress only, no historical-install upgrade. One replay (portable.mjs via the aggregate or a single runner); the duplicate conformance tests go. Manifest `tests` loses `upgradeTest`.
