# specs/quint/services/ServiceReadCache.qnt
- Lines: 99 | Kind: Quint model (services family, live; 5 tests, 4 witnesses, 11 symbol pins) | Verdict: KEEP (absorbs the cache half of `NoticesAndCaches`)
- Covers: `runtime/service-read-cache.ts` + `service-read-cache-store.ts`: one offline snapshot document per verified account identity and service; a clear fences writes requested before it; one service's clear never touches another's entries; owner switch hides the earlier account's views; restart ends unfinished writes. Sources exist (plus `prototype/inbox-cloud-adapter.ts`, `prototype/agent-calendar-adapter.ts`, the two consumers). Duplicates: `NoticesAndCaches.qnt` cache half (subset, see its report); `test/service-read-cache.test.mjs`, `test/inbox-operation-guards.test.mjs`, `application/SavedServiceRead` (`refinement/application/saved-service-read.mjs`); `scripts/test-inbox-cloud-flow.ts`. Callers/importers: manifest; harness `refinement/services/service-read-cache-replay.mjs` (loads the real store via `sourceModule` with three module stubs: `@capacitor/core`, `native-connection`, `json-domain-document`; observed replay with one reader per process); `forward-replays.mjs` (aggregate) + `test/quint-service-read-cache.test.mjs` (T4).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | — | T4 | Second cache model (`NoticesAndCaches`) and a second cache harness (`cache.mjs`) drive the same `ServiceReadCache` class. | Keep this one; delete the duplicate (see `NoticesAndCaches.qnt.md`). | Low |
| 2 | sources | A2 / D4 | `agent-calendar-adapter.ts` is a source; confirm it survives the Calendar linked-sync deletion (D4 deletes the renderer sync stack, the agent-side adapter stays). | Re-check after Stage A1. | Low |
| 3 | manifest symbols | T10 | 11 name pins (`epoch`, `clear`, `put`, `MAX_ENTRIES` …). | File pins. | Low |

## Proposed end state
The one read-cache model, unchanged; run once.
