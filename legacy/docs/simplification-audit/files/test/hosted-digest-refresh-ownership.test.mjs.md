# test/hosted-digest-refresh-ownership.test.mjs
- Lines: 58 | Kind: scenario test on the Quint refinement harness (`withHostedDigestRefresh`, Chromium + esbuild bundle of `hosted-digest-ui.tsx` with stubbed imports and a text-marker observer) | Verdict: MERGE into `test/quint-hosted-digest-refresh.test.mjs`
- Covers: follow-up reads (full refresh, inbox poll) stay with the exact session that started them; a retired poll cannot dispatch a read for the replacement session; an open panel promotes a result-only flight in the same session once. Duplicates: `hosted-digest-mutation-ownership.test.mjs` (same harness), `quint-hosted-digest-refresh.test.mjs` (9 traces over `poll/open/selectSession/syncReply…`, likely overlapping the first scenario), `test/browser/home-daily-overview.spec.ts:406`. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13-57 | T4 / P3 | Separate Chromium launch and bundle for three scenarios. | Merge as subtests into the Quint runner file. | Low |
| 2 | 14-34 | T4 | "Queued full refresh cannot use the retired agent metadata" uses the same actions (`poll`, `open`, `selectSession`, `syncReply`) as the Quint traces. | Check against the 9 traces; drop if one covers it. | Low |
| 3 | 4 | T10 | Same text-anchored harness as the sibling file. | Harness PORT (Quint chunk). | Medium |

## Proposed end state
File deleted; scenarios live once in `test/quint-hosted-digest-refresh.test.mjs` or as model traces.
