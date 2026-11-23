# specs/quint/application/BrowserHostedResultNotice.qnt
- Lines: 124 | Kind: Quint model (live, 4 runs) | Verdict: KEEP model; PORT harness
- Covers: the web build's hosted-digest result-notice ledger (`AlphaHostedResults` web plugin): digest-exact replay, latest-token settlement, owner rebinding cannot settle another owner's tap, queued settlement cannot transfer to a same-scope replacement. Duplicates: Playwright `journey-f-hosted-result.spec.ts` drives the visible path. Callers/importers: manifest (6 sources: `browser/hosted-results.ts`, `domain-document.ts`, `notice-action.ts`, `revision.ts`, `screen-locked.ts`, `runtime/hosted-result-notices.ts`); harness `browser-hosted-result-notice.mjs` (315 lines); `test/quint-browser-hosted-result-notice.test.mjs` **and** aggregate (index.mjs:81).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness:60 | T10 | `sourceContext(sources, ['browserHostedResults','hostedResultsDocument','resolveHostedResultTap','canonical'], …)` concatenates six type-stripped files with import/export lines regex-deleted and evaluates them in one `vm` context. `canonical` is module-private in `hosted-results.ts`; the harness only reaches it because exports are stripped. | Bundle `apps/app/src/browser/hosted-results.ts` with `loadBundled` (stub `browserDocuments`/`registerPlugin`) and import `resolveHostedResultTap` from `runtime/hosted-result-notices.ts`. Product change: export `canonical` (or have the harness compute digests from the stored row via the public `read`). | Low |
| 2 | — | D5 | Hosted digests are mounted in `main.tsx` (`HostedDigestPanel`) and the product reports keep them (`hosted-digest-ui.tsx` SPLIT, `hosted-results.ts` SIMPLIFY). Not a deleted feature. | None unless D5 work removes hosted digests; then DELETE model + harness together. | — |
| 3 | wrappers | T4 | Run twice (per-model + aggregate). | Per-model only. | None |

## Proposed end state
Model unchanged. Harness imports the bundled web plugin instead of a six-file text splice; one product export added (`canonical`) or digest computed from the public API. One test entry point.
