# apps/app/src/prototype/calendar-confirmation.ts
- Lines: 20 | Role: One scoped Calendar confirmation (`BrowserReviews.confirm`) that is valid only for the same Calendar drawing, connection, conversation and agent context; one at a time. | Verdict: KEEP (minor SIMPLIFY; MERGE into the calendar view owner when it exists)
- Importers: 6 — `calendar-adapter.ts`, `calendar-edit-draft-adapter.ts`, `calendar-form-draft-adapter.ts`, `canonical-calendar-drafts.ts`, `agent-calendar-adapter.ts`, `reminder-adapter.ts`; `test/fixtures/canonical-calendar-draft-owner.mjs`.
- Text/path pins: `test/calendar-confirmation.test.mjs:2` (T2: `new Function` over the file text with imports regex-stripped), `test/support/feature-parity.mjs:34` (owner mapping) and `:350`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13 | C3/C6 | `binding=()=>JSON.stringify([value.session,value.history?.conversationId,value.cloudAccount])` — another hand-built session tuple (approval-adapter's omits `cloudAccount`). | `runtime/session-key.ts`. | Low (comparison is in-memory only). |
| 2 | 15 | B1 | `valid=()=>{try{return …&&current();}catch{return false;}}` — swallows any exception from `api.isActive()`/`current()`/`JSON.stringify` as "invalid". The fallback *is* the specified behaviour (refuse), so it may stay with a comment; callers' `current` never throws today. | Drop the try/catch (callers return booleans) or comment why it is kept. | Low. |
| 3 | 4, 8 | C1 | `type Bag` for `shell`/`api`. | `ShellHost`, `ViewApi`. | None. |
| 4 | 5-6 | P6 | Module-level `reviews` instance and `active` controller assume one shell. | Fine for one shell per page; keep (document). | None. |
| 5 | 12 | NEW? | `sameDrawing` compares six `calendar` state keys by reference; `calendarAuthority` is among them — will lose `'legacy'` values with D1 but the key stays. | Keep. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `Bag` | type | 4 | ~45 files | `shell-types.ts` |
| `binding` | helper | 13 | `calendar-approval-adapter.ts:26`, `main.tsx:102,430`, `agent-adapter.ts:443,1429,1694` | `runtime/session-key.ts` |

## Proposed end state
≈18 lines, typed, shared session key; later folded into the calendar view owner module (research §5 lists it among tiny files to merge).

## Verification
`test/browser/calendar-*.spec.ts` that discard/replace drafts or create duplicates, `npm run verify` (`test/calendar-confirmation.test.mjs` is a T2 deletion candidate).
