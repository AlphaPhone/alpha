# test/fixtures/source-text.mjs
- Lines: 20 | Kind: test helper (source slicing `located()` and `normalizedSource()` for text pins) | Verdict: DELETE
- Covers: nothing product-facing; it supports source-text wiring pins. Duplicates: 47 local slicer copies (research `tests-host.md:296`). Callers/importers: `test/photo-library.test.mjs` (`located`; research verdict MERGE into camera-photos-files-scan integration) and `test/test-helpers.test.mjs` (DELETE, tests this helper).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T1, T5 | A helper that exists only for source-text assertions (T1), with its own test (T5). | Delete. When `photo-library.test.mjs` is merged, its `located()` slice is dropped (that part is a source pin), not ported. | none |

## Proposed end state
Gone, with `test-helpers.test.mjs` and the source pin inside `photo-library.test.mjs`.
