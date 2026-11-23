# apps/app/src/prototype/calendar-approval-adapter.ts
- Lines: 74 | Role: Turns agent chat messages that carry Calendar approval requests into review buttons (parse cache per message), opens the review dialog, resolves the decision through `connectionController`, and shows per-request status. | Verdict: SIMPLIFY
- Importers: 1 — `apps/app/src/main.tsx:11,145`. Imports `./calendar-approval-review`.
- Text/path pins: `test/calendar-review-parse-cache.test.mjs:9-12` (T2: slices from `export function createCalendarReviewParses` to the `/** Presentation only` comment and evals it); `test/calendar-approval-ui.test.mjs:87` (esbuild bundle with stubbed imports, T2/T3); `specs/quint/application/manifest.json:4158,4255,4303`; `test/support/feature-parity.mjs:346`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 28, 46, 73, 70 | B2 | `connectionController.getAppRecordClient?.()`, `connectionController.subscribe?.(retire)`, `alphaClient.subscribe?.(retire)`, `unmount?.call(this)`, `this.refreshAgentCalendar?.()` — all exist (`connection-ui.tsx` object literal, `alpha-client`, `Component.prototype.componentWillUnmount`, `calendar-adapter.ts:157`). | Call directly. | Low. |
| 2 | 26, 86 | C3/C6 | Session identity tuples built by hand: `JSON.stringify([snapshot.session,snapshot.history?.conversationId])` and owner key `JSON.stringify([new URL(port.identity.origin).origin,port.identity.ownerId,port.identity.agentId])` (the latter must equal `agent-calendar` `model.ownerKey`). | `runtime/session-key.ts` (`conversationKey(snapshot)`, `appRecordOwnerKey(identity)`) used here, in `calendar-confirmation.ts:13` and agent-calendar. | Low; tuple order/contents must stay identical where compared to stored values. |
| 3 | 10-20, 18 | D7 | `createCalendarReviewParses` is exported with an injectable `parseText` and a `size` getter solely for `test/calendar-review-parse-cache.test.mjs` (which transplants it by text). | Keep the cache, unexport it, drop `parseText` injection and `size`; if the cache behaviour needs a test, keep one integration test that imports the module. | None. |
| 4 | 54 | B1 | `try{current();admitted=true;}catch{/* Retired observations publish nothing… */}` — a boolean probe through exceptions. | `const admitted=stillCurrent()` returning boolean (refactor `current` into `isCurrent()` + `assertCurrent()`). | Low. |
| 5 | 44, 101 (review) | C3/B4 | `current()` re-checks 8 conditions including `JSON.stringify(alphaClient.getState().context)!==context` on every call; same pattern in `calendar-confirmation.ts:15`. | Shared `contextFence(shell)` helper (session tuple + context + draft) in the calendar owner. | Low. |
| 6 | 5, 27-35 | C1 | `type Shell=Record<string,any>` also used for agent-calendar model rows (`value:Shell`, `event:Shell`). | `ShellHost` + the agent-calendar model types exported from `runtime/agent-calendar.ts`. | None. |
| 7 | 58-72 | D2 | Wraps `renderVals` and `componentWillUnmount`; mutates `out.msgs` for every render. Comment at 68 documents an ordering dependency on `maps-chat-adapter.ts`. | Register as a message decorator in the ordered hook registry (D2) with the order stated as data. | Medium (ordering). |
| 8 | 30-34 | D8 | `labels()` is three 200-400-character lines. | Format; name `matches`. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `Shell` | type | 5 | `Bag`/`Shell` in ~50 prototype files | `prototype/shell-types.ts` |
| `CalendarReview` | type | 6 | `ReturnType<typeof calendarReviewText>` | export from `runtime/calendar-approval.ts` |
| `createCalendarReviewParses` | helper | 10-20 | message parse memo patterns in `maps-chat-adapter.ts` | keep local, unexported |
| `binding` | helper | 26 | `calendar-confirmation.ts:13` (adds `cloudAccount`), `main.tsx:102,430`, `agent-adapter.ts:443,1429,1694` | `runtime/session-key.ts` |
| owner key tuple | inline | 29 | `agent-calendar` model `ownerKey` writer | `runtime/session-key.ts` |

## Proposed end state
≈62 lines: direct calls instead of optional ones, session/owner keys from one helper, unexported parse cache without test hooks, boolean `isCurrent`, formatted `labels`. Later becomes a chat-message decorator in the hook registry.

## Verification
`test/browser/calendar-approval-queue.spec.ts`, `npm run verify` (T2 tests above break and are D10 deletions), Quint application manifest approval entries; Android emulator check of approving/declining an agent Calendar change (real agent integration is separate).
