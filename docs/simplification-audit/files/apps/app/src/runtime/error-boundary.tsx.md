# apps/app/src/runtime/error-boundary.tsx
- Lines: 146 | Role: startup recovery screen (plain DOM) and the React root error boundary, both with Reload and a launcher-only "Switch Home" escape. | Verdict: SIMPLIFY
- Importers: 1 (`main.tsx`: `RootErrorBoundary`, `installGlobalErrorRecovery`). Text/path pins: `specs/quint/application/manifest.json`, `specs/quint/refinement/application/recovery-ui.mjs` (uses `showRecoveryScreen`, `installGlobalErrorRecovery`), `test/error-boundary-home-escape.test.mjs` (source text), `test/browser/accessibility-resilience.spec.ts`, `test/browser/accessibility-states.ts`, `scripts/audit-production-bundle.ts` (denies `alpha:force-render-error` / `alpha:render-error-check` markers), `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 20-27, 137-142 | C3/D12 | The recovery UI is written twice: imperative DOM with CSS strings (`recoveryStyle`) and JSX with the same styles as objects; the button style object is duplicated inside the JSX (140, 141). | Move the styles to CSS classes (`.alpha-recovery`, `.alpha-recovery-panel`, `.alpha-recovery button`, `.alpha-recovery pre`) in the global stylesheet; both renderers set class names only. Keep the plain-DOM path (needed when React fails). | Low (visual parity; accessibility snapshots) |
| 2 | 15 | B2 | `typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'unknown'`; Vite always defines it. | Use `__APP_VERSION__`. | None |
| 3 | 105 | B2 | `typeof window === 'undefined'` in browser-only code. | Delete. | None |
| 4 | 47-53 | B1/B2 | `homeEscapeAvailable`: `try{…Capacitor.isPluginAvailable('DeviceApps')…}catch{return Promise.resolve(false)}`; `DeviceApps` ships in the same APK. | Keep the `.then(…, () => false)` (a failure must hide the button, by design) but drop the outer try and the `isPluginAvailable` probe. | Low |
| 5 | 55-58 | B1 | `openHomeChooser`: `try{void …openHomeChooser().catch(() => undefined)}catch{}` double swallow. | Keep the `.catch` (Reload stays available is the specified fallback); drop the outer try. | None |
| 6 | 13, 47, 55, 63 | A7 | `recoveryDiagnostics`, `homeEscapeAvailable`, `openHomeChooser`, `showRecoveryScreen` exported; 0 product importers (tests/Quint use text or import `showRecoveryScreen`). | Un-export the first three; `showRecoveryScreen` stays exported only while `recovery-ui.mjs` imports it. | Low |
| 7 | 115-124, 130-134 | D5/D7 | Test hook (`alpha:force-render-error`, `ForcedFailure`) inside the production component, gated by `testMocksEnabled` and policed by the bundle audit. | Acceptable as is; optional: move the hook to a dev module that wraps `RootErrorBoundary`. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `recoveryStyle` | const | 20-27 | the same styles as JSX objects at 137-142 | CSS classes |
| `takeOverFromOpenDialogs` | helper | 34-41 | dialog close/remove logic in the 21 imperative `<dialog>` modules (C4) | stay |
| DeviceApps / ElizaSystem plugin interfaces | type (inline) | 50, 56 | `DeviceApps` typed again in `daily.ts` and others (C2) | the one typed plugin module |

## Proposed end state
One set of CSS classes used by both renderers, no environment probes, private helpers. ~105 lines.

## Verification
`test/browser/render-error-recovery.spec.ts`, `test/browser/accessibility-resilience.spec.ts`, `test/error-boundary-home-escape.test.mjs`, Quint `recovery-ui.mjs`, production bundle audit (markers).
