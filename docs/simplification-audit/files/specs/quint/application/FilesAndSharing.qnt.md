# specs/quint/application/FilesAndSharing.qnt
- Lines: 51 | Kind: Quint model (live: listed in specs/quint/application/manifest.json, loaded by scripts/quint-lib.ts / check-quint.ts) | Verdict: KEEP
- Covers: reviewFileEmail rereads the source before inserting into an account-bound local draft; failed insert needs new review. Duplicates: Files/camera share Playwright specs. Callers/importers: `specs/quint/refinement/application/boundaries.mjs` (`filesAndSharing`, via `test/quint-application-refinement.test.mjs` (via `refinement/application/index.mjs`)), README.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness | — | boundaries.mjs bundles `file-email-review.ts`/`inbox-attachment.ts` (import) in JSDOM. | None. | — |
| 2 | manifest sources | P1 | Sources include `share-panel-adapter.ts`, `media-copy-intent.ts`, `AlphaMailAttachmentsPlugin.java` not loaded by the harness. | Narrow sources. | Low. |
| 3 | — | — | `file-email-review.ts` is to be rebuilt on `openReview` (its per-file report); the model is behaviour-level and survives. | Re-run after rebuild. | — |

## Proposed end state
Unchanged model; sources narrowed; per-model runner when aggregate goes.
