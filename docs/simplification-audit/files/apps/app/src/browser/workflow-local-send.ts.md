# apps/app/src/browser/workflow-local-send.ts
- Lines: 28 | Role: dev workflow simulator — "send" step that writes a message or email into the simulated Messages/Inbox apps, idempotent by operation id | Verdict: KEEP (minor SIMPLIFY)
- Importers: 1 — `browser/simulated-workflows.ts:16` (dev-only). Text/path pins: `test/browser/dev-workflow-executor.spec.ts`, `test/browser/dev-workflow-messages.spec.ts`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8, 10, 11, 21 | D10 | dispatch on step text `action==='a message to maya'||action==='a reply to the sender'`, `'an email to me'` | template ids, if owner keeps the simulator | dev-only |
| 2 | 5, 6 | C3 | dev-app-state merge + raw `localStorage.getItem('alpha.dev.app.'+name)` | `devAppState(api,name)` | none |
| 3 | 15, 19, 23, 25 | C3 (local) | `{output:text,detail:'Local message saved ('+operationId+')'}` twice, email variant twice | `const saved=(kind)=>({output:text,detail:`Local ${kind} saved (${operationId})`})` | none |
| 4 | 17 | D8 | `k=Math.max(now.getHours()*60+…,...Object.values(state.threads as Bag).flatMap((messages:any)=>…))+1` | named `nextMessageKey(state)` | none |
| 5 | 1 | C1 | `type Bag` | shared | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `current` | helper | 5 | 10 sites | `devAppState` |
| `save` | helper | 6 | `workflow-receipts.ts:26` / `workflow-trigger-runtime.ts:81` size-cap-then-setView | could share `saveDevApp(api,name,patch,cap)` | 

## Proposed end state
~26 lines; same receipts and copy.

## Verification
`test/browser/dev-workflow-executor.spec.ts`, `dev-workflow-messages.spec.ts`.
