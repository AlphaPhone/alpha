# test/embedding-host-producer-closure.test.mjs
- Lines: 54 | Kind: source-text over `scripts/prepare-embedding-host.ts` (lines 8-9, 41-43) + an import-closure walk over **vendor** producer sources with a regex import parser + two tests of its own helper | Verdict: DELETE; move the closure check into `scripts/prepare-embedding-host.ts` as a run-time precondition
- Covers: the files the producer copies (`embeddingProducerInputPaths`) are the full import closure of the pinned upstream `stage-elizavoice-lib.ts`, with no package imports. Duplicates: `embedding-host-admission.test.mjs` "producer helper drift" case. Callers/importers: `npm test`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-9, 41-43 | T1 | Module-level `assert.match` over the producer script text (import alias, statement order via `indexOf`, error message literal). A failing module-level assert aborts the whole file. | Delete. | None. |
| 2 | 12-40 | T10 | Regex import parser walking vendor files. It is a real property (copy set = closure), but the place to enforce it is the producer: before running, it can resolve the closure and refuse an uncopied import. | Move the walk into `prepare-embedding-host.ts` (fail with the missing path); delete here. | Low. |
| 3 | 46-54 | T5 | Tests of the test's own helper. | Delete. | None. |

## Proposed end state
File deleted; `prepare-embedding-host.ts` checks its copied closure before building (one throw), exercised whenever the
embedding host is prepared.
