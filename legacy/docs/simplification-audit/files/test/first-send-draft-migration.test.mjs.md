# test/first-send-draft-migration.test.mjs
- Lines: 36 | Kind: Quint refinement wrapper (line 14-17) + transplant (fixture `test/fixtures/first-send-draft-migration.mjs` slices `settleFirstSendSlot(` .. `/**\n * A new chat` out of `apps/app/src/prototype/agent-adapter.ts` and runs it with the upstream durable-draft store in a vm) | Verdict: DELETE
- Covers: the first send moves the chat draft from the room-less slot to the room slot with a compare-and-swap, and keeps the source when the held read outlives a rebind, retire or replaced destination. This is live behaviour, not a legacy-data migration (A1 does not apply). Duplicates: `specs/quint/refinement/application/first-send-draft-migration.mjs` (11 traces, run again by `specs/quint/refinement/application/index.mjs` and the Quint aggregate) uses the same fixture. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14-17 | T4 | Runs `checkFirstSendDraftMigration()` and asserts 11 traces; the same refinement runs in the Quint lane. | Delete; the single manifest-driven Quint runner covers it. | Low |
| 2 | 19-36 | T2 | The four cases drive the transplanted slice through the fixture's held raw slots. | Delete. | Low |
| 3 | fixture | T10 | `test/fixtures/first-send-draft-migration.mjs` is imported by the Quint refinement too, so it does not die with this file. | PORT: export `settleFirstSendSlot` from the adapter (or the module it moves to in the `agent-adapter.ts` split) and have the refinement import it; then the fixture moves under `specs/quint/refinement/application/`. | Medium (the refinement breaks on the next adapter edit until ported) |

## Proposed end state
File deleted. The FirstSendDraftMigration model stays live; its harness imports the exported migration function and
the upstream `durable-draft.ts` instead of slicing text. A `journeys/chat.spec.ts` case ("type a draft, send the
first message, the draft is not duplicated or lost after reload") covers the user path.
