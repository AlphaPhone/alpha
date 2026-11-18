# specs/quint/application/EmailSuggestionReview.qnt
- Lines: 115 | Kind: Quint model (live: listed in specs/quint/application/manifest.json, loaded by scripts/quint-lib.ts / check-quint.ts) | Verdict: KEEP model; PORT fixture
- Covers: "Use in email" review: a rendered review authorizes one exact local draft suggestion; replaced/closed review retires controls. Duplicates: Aggregate re-run (T4). Callers/importers: `specs/quint/refinement/application/email-suggestion-review.mjs`, `test/fixtures/use-in-email-review.mjs`, `test/quint-email-suggestion-review.test.mjs`, `test/quint-application-refinement.test.mjs` (via `refinement/application/index.mjs`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | fixture 11-14 | T2 | Fixture removes `import` lines and `export` keywords from `use-in-email-review.ts` and upstream `use-in-email.ts` by regex and concatenates them (transplant). | Bundle-import `prototype/use-in-email-review.ts` with esbuild. | Low. |
| 2 | harness 63 | B5 | Asserts the `.eliza` projection is byte-identical to `vendor/eliza` (checks prepare-client-features, not the product). | Delete. | None. |
| 3 | manifest | T4 | Aggregate duplicate. | Drop from aggregate. | None. |

## Proposed end state
Model unchanged; harness imports the module; no projection byte check.
