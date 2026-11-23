# test/deletion-notice-policy.test.mjs
- Lines: 73 | Kind: unit with stub ports (imports real `createDeletionNoticePolicy` from `apps/app/src/runtime/deletions.ts` via `tsImport`; native port and owner identity are fakes) | Verdict: MERGE into `test/integration/calendar.test.ts` (three cases); delete the rest
- Covers: the owner-scoped deferred-deletion notice bridge: passive status-poll failures stay quiet unless a deletion is known pending; explicit Undo/dismiss failures always surface; only a confirmed Undo or resolved dismissal retires a row; an A→B→A owner change or a stale poll/Undo from an old session cannot revive or clear another session's state. Duplicates: partial: `specs/quint/refinement/application/browser-deletion-poll.mjs` replays the browser `calendar-deletions.ts`/`reminder-deletions.ts` journals, not this policy; `test/browser/note-audio-delete-recovery.spec.ts` and `browser-reminder-edit-recovery.spec.ts` show the notice but never change owner. Callers/importers: `npm test` glob; product user is `apps/app/src/runtime/deletion-undo.tsx`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4 | — | Real module import (good); `tsImport` per file costs a tsx loader spin-up. | Area integration file imports once. | Low |
| 2 | 17-45 | T3 | Quiet-vs-visible failure rules, three tests on fakes. | Carry one table-driven case (no known row → quiet; known row → error; explicit Undo/dismiss → always error). | Low |
| 3 | 47-73 | — | Owner A→B→A staleness: the risky part, not reachable by Playwright without an owner switch. | Carry "old A poll cannot revive warnings after A→B→A" and "late Undo from old A cannot clear new A's row". | Medium |

## Proposed end state
Three cases in `test/integration/calendar.test.ts` (or the area that owns deferred deletions) using the real
`createDeletionNoticePolicy` with a fake native port. This file deleted.
