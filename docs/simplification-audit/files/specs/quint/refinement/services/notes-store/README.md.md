# specs/quint/refinement/services/notes-store/README.md
- Lines: 65 | Kind: harness documentation | Verdict: KEEP, SIMPLIFY
- Covers: describes the `CanonicalNotesStore` source campaign (upstream `plugin-notes` NotesStore/NotesService/interact and client decoder), observed contracts and limits. Duplicates: the obligations and assumptions are restated in `notes-store/index.mjs:139-147`. Callers: none (documentation); not linked from `specs/quint/services/README.md` (checked by grep).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 56-65 | A8 / B5 | "Verification at upstream 475a8d59dc", seed/trace counts, `test-results/quint-notes/model` "superseded attempts", prerequisite commit 3185352291: a dated verification log, not a description of current behaviour; the pin moves. | Delete the section. Receipts carry hashes. | Low |
| 2 | 13 | B5 | Exact counts ("11 schedules record 46 checkpoints and 22 observed expressions") go stale with any scenario change. | Delete the counts. | Low |
| 3 | 23-24 | A1 (upstream format) | "Legacy notes use timestamp and raw array order until an edit assigns private revision metadata" describes upstream's handling of documents without `noteRevisions`; this is the upstream store's current schema-3 behaviour, not an Alpha legacy reader, so D1 does not remove it. | Keep, reword "legacy" to "notes without revision metadata". | Low |

## Proposed end state
~35 lines: what the campaign executes, what the model observes, what remains outside. No dated pins or counts.
