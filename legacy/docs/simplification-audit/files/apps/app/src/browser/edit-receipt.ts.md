# apps/app/src/browser/edit-receipt.ts
- Lines: 26 | Role: pure LemmaScript-verified rules for when a reviewed-copy receipt may be removed | Verdict: KEEP
- Importers: 1 (prototype/browser-camera.ts). Text/path pins: LemmaScript-files.txt; test/browser-camera-storage.test.mjs; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4, 6 | A7 | `PREPARED_RECEIPT_TTL` and `EditReceiptState` have no app importer outside this file (only 2 tests). | Keep exported: tests and LemmaScript read them. No change. | - |
| 2 | 14 | - | Lemma spec `now - 0 > 86400000` restates TTL literal. | Keep (Lemma syntax). | - |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| - | - | - | none | - |

## Proposed end state
Unchanged; verified file. Folder move (browser→prototype/camera) optional. Estimated lines after: 26 (current 26).

## Verification
LemmaScript run (npm run verify), test/browser-camera-storage.test.mjs.
