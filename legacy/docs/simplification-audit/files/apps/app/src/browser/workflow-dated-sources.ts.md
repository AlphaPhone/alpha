# apps/app/src/browser/workflow-dated-sources.ts
- Lines: 24 | Role: dev workflow simulator — resolves labels like "overnight inbox and today's calendar" to dated rows from the simulated Notes/Inbox/Calendar | Verdict: MERGE into `browser/dev/workflow-sources.ts` (with workflow-calendar.ts, workflow-messages.ts) or DELETE with the simulator (owner)
- Importers: 1 — `browser/simulated-workflows.ts:9` (dev-only, stubbed by `vite.config.ts:29`). Text/path pins: `test/browser/dev-workflow-dates.spec.ts` (page.evaluate import of `workflowDateRange`, `datedRows`), `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 15-16, 20, 22 | D10 / P16 | Label list `["today's notes",'overnight inbox',…]` and `text.startsWith("this week's")`, `text.startsWith('overnight')` drive behaviour | Lookup table `{label:{sources:['calendar','notes','sentMail'],range:'week'}}` | dev-only |
| 2 | 17 | C3 | `const current=()=>({...api.get('inbox'),...JSON.parse(localStorage.getItem('alpha.dev.app.inbox')||'{}')})` — the "dev app state" merge appears in workflow-focus.ts:9,26,41, workflow-local-send.ts:5, workflow-receipts.ts:6, workflow-trigger-runtime.ts:14,43, workflow-messages.ts:3, simulated-workflows.ts:26, simulated-apps.ts:52 | One `devAppState(api,name)` exported from `simulator-recovery.ts` (which already owns `key=(name)=>'alpha.dev.app.'+name`, line 8) | none |
| 3 | 2 | C1 | `type Bag=Record<string,any>` | shared `Bag` type (types.md) | none |
| 4 | 18, 22 | C3 (local) | `datedRows(current().mails.filter((row:Bag)=>!row.arch&&!row.del),workflowDateRange('overnight',now),'received')` written twice | `const overnightInbox=()=>…` | none |
| 5 | 19, 23 | B3 | `signal.throwIfAborted()` after every await in dev fixture | keep one per await (already) — no change beyond merge | — |
| 6 | 21 | D10 | `workflowCalendarRange(week?"this week's calendar":"today's calendar",now)!` — passes English labels into another label parser to get a range | Call the range builder by kind (`'week'`/`'today'`) once merged | low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `Bag` | type | 2 | 41 files in src | shared type |
| `current` (dev app state) | helper | 17 | 10 sites (see #2) | `simulator-recovery.ts` `devAppState` |
| `workflowDateRange` | helper | 3-9 | `workflow-calendar.ts:4-13` | merged module |

## Proposed end state
Part of `browser/dev/workflow-sources.ts`; ~20 lines here after table-driven dispatch and shared helpers.

## Verification
`test/browser/dev-workflow-dates.spec.ts` (import path), dev workflow specs `test/browser/dev-workflow-*.spec.ts`; bundle audit.
