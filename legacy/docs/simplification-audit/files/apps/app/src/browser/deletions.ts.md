# apps/app/src/browser/deletions.ts
- Lines: 29 | Role: web `AlphaDeletions` plugin: pending/undo/dismiss across calendar and reminders, journal receipts, and reviewed reminder deletion. | Verdict: SIMPLIFY
- Importers: 3 (`register.ts:1,32`, `runtime/deletion-undo.tsx`, `runtime/local-agent-storage.ts`). Text/path pins: `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 20 | C3 | Inline SHA-256 hex of the operation. | `sha256Hex`. | None |
| 2 | 22 | C1 | `journalBinding?:{scope:string;proposalId:string;operationHash:string}`. | `JournalBinding`. | None |
| 3 | 15-16 | D9 | `dismiss`/`undo` both branch `calendar`/`reminder` then throw. | `const owners={calendar:this.calendar,reminder:this.daily}`; one lookup. | None |
| 4 | 19 | C6 | Id regex and hex-64 regex. | Shared constants. | None |
| 5 | 24 | B1 | `try{selected=await this.daily.deletionSelection(target);}catch{return {status:'stale'};}` — documented ("definite refusal"). | Keep. | — |
| 6 | 1 | D4 | Absorbs `deleted-note-origins.ts` (merge). | Inline the port here. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| journal identity input type | type (inline) | 18 | `journalIdentity` in `calendar.ts:40` | `JournalIdentity` in `journal-retention.ts` |

## Proposed end state
~32 lines incl. the merged deleted-note port; shared hash/type/regex helpers.

## Verification
`test/browser/reminder-delete-review.spec.ts`, `calendar-delete-*.spec.ts`, `native-calendar-deletion-routing.spec.ts`, Quint `browser-deletion-poll`.
