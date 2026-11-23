# specs/quint/refinement/services/inbox-coordinator.mjs
- Lines: 449 | Kind: Quint refinement harness (real Inbox modules via `inbox-coordinator-ports.mjs`) | Verdict: KEEP, SIMPLIFY
- Covers: Gmail send coordination: capability readbacks (withdrawn, unavailable, stale), confirmation CAS vs account change, grant withdrawal and regrant, attachment owner fence and content binding, lost reply/restart without redispatch, Cloud owner change, full-adapter read withdrawal, storage failure retry (18 schedules) against `InboxCoordinator.qnt` (imports `InboxDelivery`). Duplicates: some overlap with Playwright Inbox send journeys, but those cannot hold a CAS or lose a reply; keep this as the concurrency evidence. Callers: `services/index.mjs`, `inbox-cleanup.mjs`, `inbox-provider-drafts.mjs`, `test/quint-inbox-coordinator.test.mjs` (T4).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-18 | C3 | Local `deferred`/`until` (third copy with `inbox-cleanup.mjs`; `support.mjs` exports both). | Import from `support.mjs`. | Low |
| 2 | 20-44 | T10-lite | `observe` finds records by parsing `JSON.parse(value.owner)[1]`, `[3]`, nested `binding` arrays: depends on persisted owner-tuple layout (stable by G5) but unreadable. | Name the tuple fields once (`ownerTuple(value)`), or import the owner's decoder if exported. | Low |
| 3 | 75-445 | D9 | One 370-line function holds all schedules in bare blocks. | Split into one named async function per schedule, table of `[name, fn]` like `inbox-cleanup.mjs`. | Low |
| 4 | 444-449 | — | CLI entry plus re-export of helpers for `inbox-cleanup.mjs`. | Drop the CLI entry; keep exports (or merge cleanup in). | Low |
| 5 | 333 | D2 | Full-adapter scenario calls `app.shell.inboxAccountsChanged(...)`, a method the adapter monkey-patches onto the shell. | Re-point after the adapter split. | Medium |

## Proposed end state
Same schedules as named functions, shared helpers from `support.mjs`, executed once by `test/quint-inbox-coordinator.test.mjs`.
