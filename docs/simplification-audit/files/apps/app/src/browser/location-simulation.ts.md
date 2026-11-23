# apps/app/src/browser/location-simulation.ts
- Lines: 55 | Role: dev: simulated coordinates store (alpha.dev.location.v1) and its editor dialog | Verdict: MOVE to apps/app/src/dev/ (or DELETE with simulator)
- Importers: 4 (device-controls.tsx, location.ts, workflow-location.ts, workflow-trigger-runtime.ts). Text/path pins: specs/quint/application/manifest.json; test/browser/dev-location.spec.ts, dev-workflow-triggers.spec.ts, location-settings-recovery.spec.ts, remaining-dialog-layout.spec.ts (import `saveLocationSimulation`); test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10, 16, 19 | D5 (P1) | Three gates: `if(!devSurfacesEnabled\|\|!browserDevProfile)` in read/save plus the `openLocationControls` export fold. | One dev-module boundary; delete inner gates. | Low. |
| 2 | 7 | A7 | `export type LocationSimulation` has no importer outside the file. | Unexport. | None. |
| 3 | 16 | B3 | `localStorage.setItem(...);if(localStorage.getItem(key)!==raw)throw` read-back check. | Delete read-back (same in simulator-writer.ts:27,33). | Low. |
| 4 | 24-25, 54 | C4 (P4) | cssText, theme copy, retire-event lifecycle. | Dialog kit. | Low. |
| 5 | 27 | C3 | `field()` helper near-identical to incoming-simulation.ts:12. | Dialog kit `labeledField`. | None. |
| 6 | 37-40 | C3 | Blob download block (twin of domain-recovery.ts:31-33, simulator-recovery.ts:38). | `downloadText`. | None. |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| field | helper | 27 | incoming-simulation.ts:12 | dialog kit |
| backup download | helper | 37-40 | domain-recovery.ts, simulator-recovery.ts, prototype/browser-camera.ts | dialog kit downloadText |

## Proposed end state
Dev module: read/save store + editor using the dialog kit; no inner gates. Product location.ts no longer imports it directly (see location.ts). Owner decision (research §7 Q3): the whole development simulator may be deleted; if kept, move to apps/app/src/dev/. Estimated lines after: 40 (current 55).

## Verification
test/browser/dev-location.spec.ts, location-settings-recovery.spec.ts, dev-workflow-triggers.spec.ts.
