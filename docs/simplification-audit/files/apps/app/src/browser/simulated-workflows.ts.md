# apps/app/src/browser/simulated-workflows.ts
- Lines: 101 | Role: dev: label-driven local workflow executor for the prototype Workflows view | Verdict: MOVE to apps/app/src/dev/ (or DELETE with the development workflow engine)
- Importers: 1 (simulated-apps.ts). Text/path pins: test/locale-time-usage.test.mjs (reads source text); test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 31-61 | D10 (P16) | Dispatches on English step labels (`text==='read it aloud'`, `'a notification, only if urgent'`, `"i'm not at home"` with `replaceAll('’',"'")`). | Key on step ids if kept; owner decision to delete (research §7 Q3). | High coupling to copy. |
| 2 | 23 | D5/B4 | Inner devSurfacesEnabled guard returning a stub. | Delete. | None. |
| 3 | 59 | A3 | "add the amount to wallet" → recordWorkflowExpense (Wallet deferred, AP-13). | Delete with wallet. | Owner. |
| 4 | 77-78 | C3 | "Workflow changed during this run" staleness check written twice. | Local `assertCurrent()`. | None. |
| 5 | 83 | C3 | `error instanceof DOMException&&error.name==='AbortError'` (isAbortError twin). | lib isAbortError. | None. |
| 6 | 84 | B1 | `try{persist(api,run);}catch{...}` maps to user warning — specified. | Keep. | - |
| 7 | 18-19 | C1 | Bag + local Run. | Shared Bag. | None. |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| definition | helper | 20 | focus-state.ts:16 inline JSON.stringify({name,trig,steps}) | dev/workflow-definition |

## Proposed end state
If kept: dev module with id-keyed step table. Recommended: delete with the 15 workflow-* simulator modules. Owner decision (research §7 Q3): the whole development simulator may be deleted; if kept, move to apps/app/src/dev/. Estimated lines after: 90 (current 101).

## Verification
dev-workflow-*.spec.ts (≈12 specs); drop the text check in test/locale-time-usage.test.mjs.
