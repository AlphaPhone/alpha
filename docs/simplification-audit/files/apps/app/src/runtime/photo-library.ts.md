# apps/app/src/runtime/photo-library.ts
- Lines: 12 | Role: `export *` of upstream photo-library contract plus three wrappers that pass `APP_NAME='Alpha'`. | Verdict: DELETE (or owner keeps wrappers for planned UI)
- Importers: `prototype/agent-adapter.ts:61`, `prototype/camera-adapter.ts:19`, `prototype/photo-library-adapter.ts:11` — all import upstream names only (`isLibraryOperation`, `LIBRARY_LIMITS`, `parseScope`, `prepareReview`, …).
- Text/path pins: `test/photo-library.test.mjs` (reads text; exercises the wrappers at L64-75, 163, 186), `test/photos-view-contract.test.mjs`, `test/fixtures/photo-library-adapter.mjs`, `specs/quint/legacy/manifest.json`, `specs/quint/native/manifest.json`, `feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-12 | A7/D7 | `scopePresentation`, `reviewText`, `describeLibraryOperation` (Alpha-named copy) have 0 callers in `apps/` (git grep -w); only `test/photo-library.test.mjs`. | Delete the wrappers and the test lines; or, if Photos UI should show this copy, call them from `photo-library-adapter.ts`. | Low (owner: copy intent) |
| 2 | 7 | D4/D13 | remaining body is a pure `export *` shim. | Importers use the upstream path via alias; delete file. | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `APP_NAME='Alpha'` | const | 9 | `'Alpha'` app name in `reminder-creations.ts:42`, `subscription-entitlement.ts:32` (`'Alpha Phone'`) | `product/` registration |

## Proposed end state
Deleted; three importers import upstream.

## Verification
`test/photo-library.test.mjs`, `test/photos-view-contract.test.mjs`, Photos browser specs.
