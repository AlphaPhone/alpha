# apps/app/src/browser/device-controls.tsx
- Lines: 51 | Role: React development device-controls button + dialog (home/back/power, recovery shortcuts, profile switch) | Verdict: SIMPLIFY + MOVE to apps/app/src/dev/
- Importers: 1 (main.tsx:37, re-gated at main.tsx:99). Text/path pins: specs/quint/application/manifest.json; vite.config.ts:28 stub string `./browser/device-controls`; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 51 | D5 (P1) | `export const BrowserDeviceControls=devSurfacesEnabled?DevelopmentDeviceControls:()=>null` duplicates the vite.config.ts:28 resolve stub and main.tsx:99 `devSurfacesEnabled?DevDeviceControls:null`. | Keep exactly one gate: the dynamic dev import. Export the component directly. | Low; run audit-production-bundle. |
| 2 | 16 | D5 | `if(devSurfacesEnabled)void import('./device-controls.css')` — a fourth gate. | Plain `import './device-controls.css'` once the module is only loaded in dev. | None. |
| 3 | 21 | C4 (P4) | Theme-token copy loop `for(const key of ['bg','fg','s2','line','mut'])` — one of 15 copies. | Use dialog kit `copyTheme(dialog,prefix,tokens)` or mount in .os. | Low. |
| 4 | 36-47 | D10 | 13 near-identical `<button onClick={()=>{dialog.current?.close();X();}}>` lines. | Table `[[label, action, devOnly]]` mapped to buttons. | None; labels unchanged. |
| 5 | 46-47 | C2 | Inline `registerPlugin<{compose()}>('AlphaNotifications')` and `registerPlugin<{requestRole}>('ElizaSystem')`. | Import typed plugin modules. | Low. |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| Command | type | 12 | main.tsx command union | export from dev module |
| open (theme copy) | helper | 21 | 14 browser/ dialogs | dialog kit |

## Proposed end state
Dev-only React component under dev/, exported without fold; CSS imported statically; recovery buttons generated from a table. Owner decision (research §7 Q3): the whole development simulator may be deleted; if kept, move to apps/app/src/dev/. Estimated lines after: 35 (current 51).

## Verification
test/browser/dev-controls-accessibility.spec.ts, accessibility-sweep.spec.ts (dev), audit-production-bundle with flag off.
