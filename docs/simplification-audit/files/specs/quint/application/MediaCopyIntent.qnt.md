# specs/quint/application/MediaCopyIntent.qnt
- Lines: 81 | Kind: Quint model (live, `specs/quint/application/manifest.json`) | Verdict: KEEP
- Covers: one pending saved-copy request: CAS admission, exact acknowledgement (browser by revision, Android by token), recovery after restart (`apps/app/src/runtime/media-copy-intent.ts`). Duplicates: none. Callers/importers: `scripts/check-quint.ts` (scenarios + simulation, manifest family `application`); harness `media-copy-intent.mjs` via `test/quint-media-copy-intent.test.mjs` (not in the aggregate)

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness 4-30 | — | Bundles the real module through `loadProductModule` with stubbed `@capacitor/core` and `../browser/documents`: target pattern. | None. | none |
| 2 | — | A1 | B299 deletes the localStorage legacy seed at media-copy-intent.ts:14 (browser document seeded from old key). The model never modelled it; harness stubs `browserDocuments`. | No model change; re-run after B299. | L |
| 3 | manifest symbols | T10 | Pins exported names (`admitMediaCopyIntent`, …): acceptable, they are the public API. | Keep or pin file. | none |

## Proposed end state
- Unchanged.
