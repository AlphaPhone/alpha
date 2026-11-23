# test/fixtures/photo-library-adapter.mjs
- Lines: 178 | Kind: integration test disguised as a fixture (top-level asserts, prints PASS) | Verdict: MOVE to `test/integration/photos-library-agent.test.mjs` (node:test, direct import)
- Covers: the Photos agent bridge (`apps/app/src/prototype/photo-library-adapter.ts` + `apps/app/src/runtime/photo-library.ts`) against an in-memory device port and fake main-Library host: identity-only agent reads with opaque revisions, one review at a time, revision staleness, native change outcomes (complete/partial/unverified/declined/stale/busy), view requests, visibility and hide-ends-review. Duplicates: partial overlap with Quint model `specs/quint/application/PhotoLibraryAgentReview.qnt` and Playwright `test/browser/photo-agent-review-leave.spec.ts`; no other host test drives these paths. Callers/importers: spawned by `test/photo-library.test.mjs:242` via `node --import=tsx` (a separate 120 s-timeout process).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-6, 178 | T9 | The real test lives in a fixture and is run by spawning a second Node process from another test, only to get `tsx` loading. | Make it a `node:test` file run by the normal test runner with the project's TS loader; delete the spawning case in `photo-library.test.mjs`. | Low |
| 2 | 6-7 | — | Imports real modules (no slicing); good integration shape. Fakes are only the device port and the host, the trust boundaries. | Keep. | — |
| 3 | 36, 85, 107 | A8 | Section numbers "4.", "5.", "6." refer to a numbering in a file that no longer has 1-3. | Turn each block into a named `test(...)`. | — |
| 4 | 159-176 | B4 | Sets/deletes `globalThis.document` by hand for visibility. | Keep but wrap in the test's setup/teardown. | Low |
| 5 | 1-4 | — | Header claims catalog paging is tested "directly on LibraryCatalog in test/photo-library.test.mjs" and grid rules in `photos-view.test.mjs`; those are unit/source-text files likely to be deleted, so this comment will be wrong. | Drop the cross-references. | — |

Cases worth carrying (all): agent search returns no names/sizes/times and opaque revisions; native revisions refused at the boundary; racing reviews -> only first opens; leaving Photos during validation opens none; denied scope refuses reads; each native change outcome's status text and undo; stale-before-approval sends no Android request; reviewed share sends exactly the reviewed items; hidden app ends an open review but not a confirmed change.

## Proposed end state
`test/integration/photos-library-agent.test.mjs`, ~170 lines, five named tests, imported directly; `test/fixtures/photo-library-adapter.mjs` and the spawn case removed.
