# specs/quint/application/RetainedHomeBrief.qnt
- Lines: 68 | Kind: Quint model, live (in `application/manifest.json`, run by `quint:check`) | Verdict: KEEP
- Covers: Home brief: only the current scope publishes, non-running occurrences never become a brief, observers are notified from a copied set. Duplicates: none. Callers/importers: `retained-home-brief.mjs` (aggregate) <- `test/quint-retained-home-brief.test.mjs` + aggregate (T4).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness | - | Import-based (`bundledSource` of `runtime/hosted-digests.ts`). | None. | - |
| 2 | manifest | - | Consumer is live: `main.tsx:77` imports `latestRetainedDigest`, `subscribeRetainedDigest`. | None. | - |

## Proposed end state
- Keep; fate tied to owner question Q-HOST-5 with the other hosted-digest models.
