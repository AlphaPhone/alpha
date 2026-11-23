# apps/app/src/browser/dialog-layout.ts
- Lines: 11 | Role: normalises a browser dialog into themed content region + footer | Verdict: SIMPLIFY (grow into the shared dialog kit)
- Importers: 15 (clock, device, domain-recovery, incoming-simulation, location-simulation, notifications, password-provider, reading-review, retained-data-notice, simulator-recovery, workflow-history, workflow-receipts, workflow-result-input, workflow-urgency, passwords/dev-vault). Text/path pins: inventory only; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6 | C3 (P4) | Theme copy + dark detection `.toLowerCase()==='#000000'`; 7 other files use `.toUpperCase()` variant (calendar-editor, calendar-meeting, calendar-response, mail-attachments, review, selected-document-viewer, prototype/note-source-adapter). | Export `applyShellTheme(dialog,{prefix,tokens})` here and use it everywhere. | Low. |
| 2 | 3-4 | D7 | Strips inline `cssText` set by callers (they set cssText then this erases it except tokens). | Callers stop setting cssText (domain-recovery:11, incoming-simulation:9, location-simulation:24, password-provider:25, device:82, simulator-recovery:32, retained-data-notice:7, reading-review:11) and this stops stripping. | Medium; layout specs (remaining-dialog-layout, workflow-dialog-layout). |
| 3 | all | C4 | Only the presentation half of the dialog kit; lifecycle (alpha-back, pagehide, visibilitychange, focus restore) is re-implemented in ~20 callers. | Add `openOwnedDialog({label,actions,retireOn,mount:'.os'})` returning `{dialog,signal,close}` here. | Medium: capture-phase `alpha-back` + stopImmediatePropagation must be preserved. |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| layoutBrowserDialog | helper | 2-11 | prototype dialogs | this file → dialog-kit.ts |

## Proposed end state
Becomes `dialog-kit.ts`: layoutBrowserDialog + applyShellTheme + openOwnedDialog + downloadText. Callers lose their copies. Estimated lines after: 25 (current 11).

## Verification
test/browser/remaining-dialog-layout.spec.ts, workflow-dialog-layout.spec.ts, large-text-layout.spec.ts, clock-dialog-accessibility.spec.ts.
