# apps/app/src/browser/workflow-history.ts
- Lines: 85 | Role: dev workflow simulator — "Workflow history" dialog: export/remove finished runs, export/compact workflow notification history | Verdict: SIMPLIFY
- Importers: 1 — `browser/simulated-workflows.ts:10` (dev-only). Imports product module `workflow-notices.ts`. Text/path pins: `test/browser/dev-workflow-history.spec.ts` (labels 'Download history', 'Remove finished runs', filename `alpha-workflow-history.json`), `test/browser/workflow-dialog-layout.spec.ts:10`, `test/browser/workflow-notice-history.spec.ts:58,76`, `test/browser/workflow-notice-lifecycle.spec.ts:4` (page.evaluate `openWorkflowHistory` — T6), `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 55, 65, 79-80 | A1 | "Older" download for legacy bytes: `legacyDownload.textContent='⤓ Older'…`, `if(recovery.legacy!==null&&(recovery.legacyChanged||recovery.legacy!==recovery.raw))` — exists only for the BrowserDomainDocument legacy envelope | Delete with the legacy envelope (research P2) | owner sign-off; `workflow-notice-history.spec.ts` asserts the older link |
| 2 | 34, 49 | A7 | `description`/`noticeDescription` `<p hidden>` created and appended, never filled or unhidden, no `aria-describedby` | delete both elements | low (check specs don't count children) |
| 3 | 31-32, 79, 81-84 | C4 / research P4 | Hand-rolled dialog lifecycle: inline cssText, theme-token copy `for(const name of ['--bg','--fg','--s2'])`, `alpha-back` capture, `pagehide/launcher-home/alpha:device-state/alpha:dev-incoming-call` retire list, focus restore — same in workflow-receipts.ts, workflow-urgency.ts, workflow-result-input.ts and 17 more | `openOwnedDialog({label,mount:'.os'})` kit; mount inside `.os` so tokens need no copy | medium: back-capture order must stay `true` + `stopImmediatePropagation` |
| 4 | 5 | C3 | `const object=(value:unknown):value is Bag=>…` — same as `simulator-recovery.ts:9`, `prototype/calendar-approval-fields.ts:5`, `runtime/agent-calendar.ts:25`, `runtime/automations-protocol.ts:22` | shared `isPlainObject` | none |
| 5 | 8, 11, 17, 21 | B3 | four `throw Error('Workflow history needs saved app recovery.')` validators of the simulator's own state | keep one shape check at read (the state comes from localStorage); single message constant | dev-only |
| 6 | 60-66 | D9 | `failure` captured, recovery offered, then rethrown — control flow via a mutable `failure` | `try{plan=await …}catch(e){offer raw; throw e}` | low |
| 7 | 3 | C1 | `type Bag` | shared | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `object` | helper | 5 | 5 sites (see #4) | `apps/app/src/lib/is-plain-object.ts` |
| `terminal` | const | 4 | run status sets in simulated-workflows.ts | keep |
| `current` (open dialog singleton) | const | 26 | per-dialog singletons elsewhere | dialog kit |

## Proposed end state
~65 lines: legacy link and dead hidden paragraphs gone, dialog plumbing from the shared kit, one validator. User-visible labels, filenames and status texts unchanged.

## Verification
`test/browser/dev-workflow-history.spec.ts`, `workflow-dialog-layout.spec.ts`, `workflow-notice-history.spec.ts`, `workflow-notice-lifecycle.spec.ts` (update the Older-link assertions if A1 lands).
