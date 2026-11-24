# specs/quint/services/InboxEditCoalescer.qnt
- Lines: 103 | Kind: Quint model, live (services manifest, with 16 `symbols` pins and 4 witnesses) | Verdict: KEEP (drop symbol pins)
- Covers: retained email-edit writes: one write per pause, bounded by `maximumWait`, a held store blocks the due write, oversized edits are reported and leave the earlier copy, retire flushes (6 runs, 8 invariants). Duplicates: none. Callers/importers: manifest; `refinement/services/inbox-edit-coalescer-replay.mjs` (imports the real `editCoalescer` from `apps/app/src/runtime/inbox-edit-coalescer.ts`, forward replay via `observed-replay.mjs`), registered in `refinement/services/forward-replays.mjs`; `test/quint-inbox-edit-coalescer.test.mjs`; aggregate via `services/index.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | manifest `symbols` | T10 | 16 names (`editCoalescer`, `push`, `flush`, `hold`, `release`, `discard`, `maximumWait`, `EditCoalescerTimers`, `inboxUnsaved`, …) are regex-checked in source text by `quint-lib.ts`; the harness already imports the module, so a missing export fails there. | Delete `symbols`; keep `sources`. | None |
| 2 | runners | T4 | Wrapper + aggregate. | One runner. | None |

## Proposed end state
Model unchanged; replay harness already runs the real coalescer with a controlled timer port; no symbol pins; path-filtered to `inbox-edit-coalescer.ts`, `inbox-unsaved.ts`, `inbox-unsaved-record.ts`.
