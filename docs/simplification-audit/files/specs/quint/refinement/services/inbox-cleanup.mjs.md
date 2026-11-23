# specs/quint/refinement/services/inbox-cleanup.mjs
- Lines: 207 | Kind: Quint refinement harness (real Inbox composer, provider controls, `InboxOperation`, unsaved records in a vm realm via `inbox-coordinator-ports.mjs`) | Verdict: KEEP; MERGE into `inbox-coordinator.mjs` as a second exported campaign when touched
- Covers: post-send cleanup of retained/shelf/saved copies with per-write faults before commit and after commit with lost reply, binding change during a known clear, peer save during cleanup; no redispatch on restart. Model `InboxCoordinator` (receipt id `InboxCleanup`). Duplicates: none for these schedules; "26 sent-cleanup tests" cited in `inbox-coordinator.md` are host tests reviewed elsewhere. Callers: `services/index.mjs`, `test/quint-inbox-cleanup.test.mjs` (T4).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-22 | C3 | Local `deferred` and `until` duplicate `services/support.mjs` exports (and `inbox-coordinator.mjs` has a third copy). | Import from `support.mjs`. | Low |
| 2 | 23-28 | T10-lite | `writeStage` recognises writes by storage key prefixes (`':unsaved:'`, `':shelf:'`, `'inbox-drafts:v1:['`). These are persisted keys (G5: byte-identical), so the coupling is to a stable format, acceptable. | Import the key builders from the owner modules if they become exported (R4). | Low |
| 3 | 192-207 | — | `obligations` and a CLI entry (`process.argv[1]`) used by nobody but the aggregate/README. | Drop the CLI entry; obligations go with the aggregate. | Low |
| 4 | — | — | Two files for one model with shared `setup/compose/review/startSend`. | Optional merge into `inbox-coordinator.mjs` (exports already shared). | Low |

## Proposed end state
Same nine schedules, shared helpers imported, executed by one InboxCoordinator test file (or kept separate if runtime matters).
