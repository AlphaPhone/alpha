# specs/quint/application/RendererDigestQueue.qnt
- Lines: 73 | Kind: Quint model, live (in `application/manifest.json`, run by `quint:check`) | Verdict: KEEP
- Covers: Scope-keyed promise queue of the renderer digest inbox: one running request per scope, aborted queued entries never dispatch, a refused predecessor releases the scope. Duplicates: RendererHostedInbox exercises the same `createDigestInbox` for retention; complementary. Callers/importers: `renderer-digest-queue.mjs` (aggregate `index.mjs`) <- `test/quint-renderer-digest-queue.test.mjs` (11-line wrapper) and the aggregate test: T4, run twice.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness | - | Import-based: `bundledSource('apps/app/src/runtime/digest-inbox.ts')` then calls `createDigestInbox`. | None. | - |
| 2 | 1-2 | A8 | No doc comment beyond one line; no `invariants`/`witnesses` in manifest. | None needed. | - |
| 3 | manifest | A7 | `delete-candidates.md` A103 merges `runtime/digest-inbox.ts` into `hosted-background.ts`. Manifest `sources` and the harness `implementation` path must follow the merge or `quint:check` fails at load (`quint-lib.ts:233`). | Update both paths in the same commit as the merge. | M |

## Proposed end state
- Keep. Path follows the A103 merge.
- Owner question Q-HOST-5 (hosted digests / Cloud reads in PRD scope) decides whether this, RendererHostedInbox and RetainedHomeBrief stay; if hosted digests are cut, delete all three with their harnesses.
- Drop the per-model wrapper test or the aggregate entry (tests chunk).
