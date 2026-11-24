# apps/app/src/browser/simulator-recovery.ts
- Lines: 43 | Role: dev: validates saved simulator app state and offers backup/reset dialog | Verdict: SIMPLIFY + MOVE to apps/app/src/dev/
- Importers: 2 (device-controls.tsx, simulated-apps.ts). Text/path pins: test/browser/remaining-dialog-layout.spec.ts; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12, 28, 31 | D5/B4 | `if(!devSurfacesEnabled)` / `devSurfacesEnabled&&` inner gates. | Delete. | None. |
| 2 | 9 | C3 | `object=(value)=>!!value&&typeof value==='object'&&!Array.isArray(value)` plain-object guard (twins workflow-history.ts:5, prototype/calendar-approval-fields.ts:5, runtime/agent-calendar.ts:25, runtime/automations-protocol.ts:22). | lib `isPlainObject`. | None. |
| 3 | 32-33, 42 | C4 (P4) | cssText, theme copy, own lifecycle. | Dialog kit. | Low. |
| 4 | 38 | C3 | Blob download block. | downloadText. | None. |
| 5 | 26 | B1 | `catch{failures.set(...)}` records failure — specified. | Keep. | - |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| object | helper | 9 | 5 twins listed | lib/object.ts isPlainObject |
| key | helper | 8 | digest-live-sources.ts:15 literal | export simulatorKey |

## Proposed end state
Dev module with shared helpers and the dialog kit. Owner decision (research §7 Q3): the whole development simulator may be deleted; if kept, move to apps/app/src/dev/. Estimated lines after: 35 (current 43).

## Verification
simulator-recovery.spec.ts, remaining-dialog-layout.spec.ts.
