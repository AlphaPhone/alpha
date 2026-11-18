# test/browser/device-apps-stub.ts
- Lines: 21 | Kind: Playwright helper: fake Capacitor bridge whose `ElizaSystem.listLauncherApps` returns `count` installed apps | Verdict: MERGE into `test/browser/harness/plugins/launcher.ts` (typed bridge)
- Covers: fills the Apps drawer with "App 00…" for layout specs. Duplicates: `accessibility-states.ts:357-396` (`launcherBridge`, near-verbatim same plugin list, answers and `addListener` loop). Importers: `test/browser/large-text-overlap.spec.ts`, `test/browser/drawer-full-height.spec.ts` (both outside this chunk; grep of `test scripts playwright.config.ts package.json .github` found no others).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-19 | C4, T7 | One of ~57 hand-written `window.Capacitor = {PluginHeaders, nativePromise, nativeCallback}` bridges. | Build on one `installBridge(page, handlers)` that derives `PluginHeaders` from the handler map. | Low. |
| 2 | 7 | C6 | Seeds `alpha.connection.selection.v1` again. | Harness fixture option. | None. |
| 3 | 8 | C1 | `const w = window as any`. | Typed via the harness. | None. |

## Proposed end state
Becomes `harness/plugins/launcher.ts` (`launcherApps(count)` handler set) shared with `accessibility-states.ts`; this file is deleted once its two importers use the harness. Survives as long as either importer survives.
