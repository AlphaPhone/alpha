# apps/app/src/browser/workflow-calendar.ts
- Lines: 23 | Role: development workflow simulator — maps English labels ("today's calendar", "calendar next 3 days") to a day range and reads/filters AlphaCalendar | Verdict: MERGE into a single `browser/dev/workflow-sources.ts` with workflow-dated-sources.ts and workflow-messages.ts (or DELETE with the simulator — owner)
- Importers: 2 — `browser/simulated-workflows.ts:12`, `browser/workflow-dated-sources.ts:1`. Reachable only through `simulated-apps.ts`, which `vite.config.ts:29` stubs out of production builds. Text/path pins: `test/browser/dev-workflow-calendar.spec.ts` (imports `/src/browser/workflow-calendar.ts` via page.evaluate — T6), `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-10 | D10 / research P16 | Behaviour keyed on display text: `if(text==="today's calendar"){}… else if(text==='calendar next 3 days')`, with `.replaceAll('’',"'")` normalisation; empty `{}` branch | Key on step ids, or at least a `const RANGES:Record<string,{shift?:number;days:number;week?:true}>` lookup table; delete empty branch | dev-only; spec dev-workflow-calendar asserts ranges |
| 2 | 2 | C3 | `const civil=(date:Date)=>Date.UTC(date.getFullYear(),date.getMonth(),date.getDate())` — same function in `workflow-receipts.ts:15` (`day`), `runtime/calendar-form-draft.ts:8`, `prototype/calendar-form-inputs.ts:3`, `prototype/calendar-interval-presentation.ts:5`, `prototype/calendar-form-draft-adapter.ts:11,42`, `prototype/calendar-edit-draft-adapter.ts:29`, `prototype/canonical-calendar-drafts.ts:84` | Export one `civilDayUtc(date)` from `browser/calendar-time.ts` (already the calendar time module) | none |
| 3 | 1 | C2 / C1 | Local `type Calendar={list:(range)=>Promise<{events:any[];truncated?:boolean}>}` — partial AlphaCalendar typing | Import the AlphaCalendar plugin type from one typed plugin module (research n–z P7) | none |
| 4 | 15, 20 | B3 / research P6 | `signal.throwIfAborted();…await…;signal.throwIfAborted();` sandwiches in a dev fixture | Keep the post-await check only | none |
| 5 | 4-13 vs dated-sources 3-9 | C5 | Two "civil day range from label" builders (`workflowCalendarRange` here, `workflowDateRange` in workflow-dated-sources.ts) both compute week start `(getDay()+6)%7` | One range builder in the merged module | low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `Calendar` | type | 1 | `startup-permissions.tsx:24`, `workflow-focus.ts` `registerPlugin<any>('AlphaCalendar')`, `workflow-trigger-runtime.ts:26,59` | typed plugin module |
| `civil` | helper | 2 | 9 sites listed above | `browser/calendar-time.ts` `civilDayUtc` |

## Proposed end state
Folded into `browser/dev/workflow-sources.ts` (≈50 lines for calendar+dated+messages) with a label→range table and shared `civilDayUtc`. ~20 of these 23 lines survive.

## Verification
`test/browser/dev-workflow-calendar.spec.ts`, `test/browser/dev-workflow-dates.spec.ts` (update import paths), production build + `npm run audit:bundle` (module must stay out of production).
