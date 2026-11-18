# apps/app/src/browser/workflow-urgency.ts
- Lines: 26 | Role: dev workflow simulator — asks the agent for an urgency decision (strict JSON), or a developer review dialog when no agent answers | Verdict: SIMPLIFY (dialog kit)
- Importers: 1 — `browser/simulated-workflows.ts:6`. Text/path pins: `test/browser/workflow-dialog-layout.spec.ts`, `test/browser/dev-workflow-urgency.spec.ts`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17-24 | C4 / P4 | full dialog boilerplate (cssText, token copy, textarea cssText, button cssText ×3, retire list add/remove, focus restore) — twin of workflow-result-input.ts and workflow-receipts.ts | dialog kit | medium (layout spec) |
| 2 | 14 | C3 / P5 | `blocked=()=>document.hidden||…devBackground==='true'||!!browserScreenLocked()` = `noticeActionBlocked` | import | none |
| 3 | 9-10 | — (keep) | strict JSON check of agent output: a real trust boundary (model output) | keep | — |
| 4 | 13-15 | B3 | `signal.throwIfAborted()` at start of `reviewUrgency`, just checked by caller at line 7 | drop | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `UrgencyDecision` | type | 3 | none | keep |
| `instruction` | const | 4 | none | keep (prompt text) |

## Proposed end state
~16 lines; prompt, validator and review copy unchanged.

## Verification
`test/browser/dev-workflow-urgency.spec.ts`, `workflow-dialog-layout.spec.ts`, `dev-workflow-background-agent.spec.ts`.
