# specs/quint/application/SavedServiceRead.qnt
- Lines: 32 | Kind: Quint model, live (in `application/manifest.json`, run by `quint:check`) | Verdict: KEEP
- Covers: Saved service-read cache projection: a saved result shows only for the same owner, credential and query and never after a refusal; only a fresh read allows mutation. Duplicates: none. Callers/importers: `saved-service-read.mjs` (aggregate) <- `test/quint-saved-service-read.test.mjs` + aggregate (T4).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-2 | D8 | Statement-soup formatting (`{owner:0,credential:0,...}` with no spaces) unlike the rest of the family. | Reformat when touched (Quint has `quint format`? if not, by hand). | - |
| 2 | harness | B5 | Import-based esbuild build of `agent-calendar.ts` + `ServiceReadCache`, but also hashes inputs (`createHash`) and writes a temp dir. | Drop hashing with the receipt cleanup (ci-and-formal §2.8). | L |
| 3 | manifest | - | Sources `runtime/agent-calendar.ts` (D4 product path, kept), `agent-calendar-adapter.ts`, `inbox-cloud-adapter.ts` (B206 trims test-only `openInbox`). | None. | - |

## Proposed end state
- Keep; reformat; harness without hash ceremony.
