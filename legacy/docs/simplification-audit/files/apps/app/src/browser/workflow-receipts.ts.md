# apps/app/src/browser/workflow-receipts.ts
- Lines: 46 | Role: dev workflow simulator — pick a receipt attachment from simulated Inbox, optionally record a Wallet expense; also dates Wallet transactions for the simulator | Verdict: SIMPLIFY (wallet parts DELETE if Wallet is removed — A3)
- Importers: 2 — `browser/simulated-workflows.ts:8` (`requestWorkflowReceipt`, `receiptAttachment`, `recordWorkflowExpense`, `ReceiptInput`), `browser/simulated-apps.ts` (`datedReceiptWallet`). Dev-only. Text/path pins: `test/browser/dev-workflow-receipts.spec.ts`, `test/browser/remaining-dialog-layout.spec.ts`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14-27, 37 | A3 | Wallet (PRD AP-13 deferred): `datedReceiptWallet`, `recordWorkflowExpense` ("Only records a local expense"), merchant/amount/card fields | If owner deletes the simulated Wallet, delete these ~16 lines and the `needsWallet` branch of the dialog | owner decision |
| 2 | 15 | C3 | `const day=(date:Date)=>Date.UTC(date.getFullYear(),date.getMonth(),date.getDate())` — civil-day twin (10 sites, see workflow-calendar report) | `civilDayUtc` | none |
| 3 | 6 | C3 | `state=(api,name)=>({...api.get(name),...JSON.parse(localStorage.getItem('alpha.dev.app.'+name)||'{}')})` | `devAppState` | none |
| 4 | 32-33, 38, 40-44 | C4 | dialog boilerplate: cssText, `['--bg','--fg','--s2']` token copy, button cssText, back/retire listener add/remove lists | dialog kit | medium (dialog layout spec) |
| 5 | 44 | C3 | inline `document.hidden||…devBackground==='true'||browserScreenLocked()` | `noticeActionBlocked()` | none |
| 6 | 20, 39 | C3 (local) | cents limits `999999999` and validation duplicated between `recordWorkflowExpense` and dialog `valid()` | one `validExpense(input)` | none |
| 7 | 4 | C1 | `type Bag` | shared | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `ReceiptInput` | type | 5 | none | keep |
| `state` | helper | 6 | 10 dev-state sites | `devAppState` |
| `day` | helper | 15 | 10 civil-day sites | `browser/calendar-time.ts` |
| `field` | helper | 35 | dialog field builders in workflow-result-input.ts:14-17, workflow-urgency.ts:19 | dialog kit |

## Proposed end state
~40 lines with shared helpers (≈25 if Wallet goes). Copy ('Workflow receipt', 'Use receipt', 'Cancel run') unchanged.

## Verification
`test/browser/dev-workflow-receipts.spec.ts`, `test/browser/remaining-dialog-layout.spec.ts`.
