# apps/app/src/browser/workflow-result-input.ts
- Lines: 28 | Role: dev workflow simulator — modal asking the developer to type the result of an unconstrained Write step | Verdict: SIMPLIFY (dialog kit)
- Importers: 1 — `browser/simulated-workflows.ts:13`. Text/path pins: `test/browser/workflow-dialog-layout.spec.ts`, `test/browser/dev-workflow-result.spec.ts` (labels 'Workflow step result', 'Use result', 'Cancel run', 'Development result'), `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-11, 16-17, 20-22, 24-26 | C4 / research P4 | dialog cssText, theme copy `['--bg','--fg','--s2']`, label/field/button cssText, back/retire/visibility listener add+remove lists — near-identical to workflow-urgency.ts:17-24 and workflow-receipts.ts:32-43 | dialog kit `openOwnedDialog` + one CSS class set | medium (layout spec measures geometry) |
| 2 | 7 | C3 | `document.hidden||…devBackground==='true'||browserScreenLocked()` | `noticeActionBlocked()` | none |
| 3 | 23 | B4 | `use.onclick` re-checks `result.value.trim()&&length<=16000` though `use.disabled` already encodes it; `maxLength=16000` also set | drop the re-check | none |
| 4 | 26 | B1 | `try{dialog.showModal();…}catch{close();}` | keep (showModal throws if detached) | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `cancelled` | helper | 3 | per-dialog AbortError builders | dialog kit |

## Proposed end state
~15 lines: build content, call the kit, resolve on Use.

## Verification
`test/browser/workflow-dialog-layout.spec.ts`, `test/browser/dev-workflow-result.spec.ts` (cancel/back/home/retire/escape cases).
