# apps/app/src/runtime/accessibility-timeout.ts
- Lines: 39 | Role: reads Android's "Time to take action" accessibility timeout through `AlphaDevice.recommendedTimeout` and exposes a scale for toast lifetimes | Verdict: SIMPLIFY
- Importers: `main.tsx` (`startAccessibilityTimeout`), `prototype/model.js` (`accessibilityTimeoutScale`). Text/path pins: `specs/quint/application/manifest.json` symbol pin `accessibilityTimeoutScale`; `specs/quint/refinement/application/accessible-toast-lifetime.mjs:123` drives `refreshAccessibilityTimeout`/`startAccessibilityTimeout`; `test/accessibility-timeout.test.mjs`; `test/browser/shell-toast.spec.ts`; `test/support/feature-parity.mjs` inventory.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11, 20 | C2 | `TimeoutPort` hand-types one method of the `AlphaDevice` plugin at this call site; the same plugin is typed separately at `crash-log.ts:52` (`CrashLogPort`), `main.tsx:181` (`SystemBars`) and `browser/simulated-workflows.ts:24` (`any`). | One typed `AlphaDevice` plugin module (e.g. `apps/app/src/native/alpha-device.ts`) exporting the plugin instance; import it here. | Low. |
| 2 | 11, 12, 14 | A7 | `TimeoutPort`, `ResumePort`, `ACCESSIBILITY_TIMEOUT_BASE_MS` are exported but have no importer anywhere (whole-repo grep: 0 hits outside this file). | Drop `export` on all three. | None. |
| 3 | 23 | D7 | `refreshAccessibilityTimeout` is exported and takes an injectable `port` only so `test/accessibility-timeout.test.mjs` and the quint refinement can drive it. | Keep while the quint refinement exists (T10); otherwise unexport. | Low. |
| 4 | 20 | B4 | `nativePort()` is a default-parameter expression, so each call re-runs `registerPlugin`. | Resolve the port once at module load (`const nativePort = isAndroid ? AlphaDevice : null`). | None. |
| 5 | 38 | B1 | `void resume.addListener(...).catch(()=>{})` swallows a listener-registration failure. | Let it reject to the crash log; `addListener` on a shipped plugin does not fail. | Low. |
| 6 | 30 | B1 (keep) | `catch{/* Keep the last scale ... */}` is the specified fallback for a failed native read. | Keep; comment already states why. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `TimeoutPort` | type | 11 | `CrashLogPort` crash-log.ts:52, `SystemBars` main.tsx:181 (other slices of `AlphaDevice`) | typed AlphaDevice plugin module |
| `ResumePort` | type | 12 | app-resume listeners typed ad hoc in main.tsx / DailyApps | `daily.ts` plugin types |

## Proposed end state
Same file, ~33 lines: no exported port types, one module-level plugin reference from the typed AlphaDevice module, no `.catch(()=>{})` on listener registration. Behaviour (scale = max(1, reply/5000), stale-refresh fence) unchanged.

## Verification
`test/accessibility-timeout.test.mjs`, `test/browser/shell-toast.spec.ts`, quint `accessible-toast-lifetime` refinement (keep `accessibilityTimeoutScale` name for the manifest pin).
