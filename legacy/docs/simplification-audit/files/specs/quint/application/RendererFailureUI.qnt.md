# specs/quint/application/RendererFailureUI.qnt
- Lines: 68 | Kind: Quint model, live (in `application/manifest.json`, run by `quint:check`) | Verdict: KEEP / PORT (light)
- Covers: Global startup recovery and the React root boundary share one reload surface: single recovery, fixed error classes, dialogs closed, sticky boundary. Duplicates: native `RendererRecovery`, `CrashLoopBreaker` (README `native/README.md:689`) cover the native side. Callers/importers: `recovery-ui.mjs` (`checkRecoveryUI`, aggregate) <- `test/quint-recovery-ui-refinement.test.mjs` and aggregate (T4).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness | T10 (light) | `recovery-ui.mjs:29` bundles the real `runtime/error-boundary.tsx` but appends `export const inspectRecoveryModule=()=>({shown,installed,forced});`, reading private module variables by name. | Observe through the DOM (`role=alert`, focus, `inert`) or export a dev-only inspector from `error-boundary.tsx`; then remove the source append. | M |
| 2 | manifest | - | `sharedSources` `plugins/plugin-native-system/src/crash-log.ts`; delete-candidates B279/B286 trim `crash-log.ts`/`error-boundary.tsx` exports and `typeof` guards; harmless to the model. | None. | - |

## Proposed end state
- Keep model; harness observes via DOM or an explicit inspector instead of appending source.
- Run once (aggregate or wrapper).
