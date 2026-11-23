# test/browser/scan-text-draft.spec.ts
- Lines: 18 | Kind: Playwright spec (`chromium`); seeds the draft by calling upstream `saveScanDraft` with text layers in the page, then drives the UI; test 3 is a store unit test; 4 tests | Verdict: **MERGE** tests 1, 2 and 4 into `journeys/camera-photos.spec.ts` (Scan section); **DELETE** test 3
- Covers: reviewed text lines are saved with the draft. They follow page reorder, export after reload without recognition (a `Worker` constructor that throws proves this), are discarded by Cancel, and are invalidated only for a replaced or corrected page. Test 3 covers invalid layers, stale saves and racing input mutations rejected by the store. Duplicates: `scan-searchable.spec.ts` (reorder keeps text), `scan-correction.spec.ts` (adopt correction), `scan-draft.spec.ts` (store races). Callers/importers: none. It imports `scan-review-navigation`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13-15 | T5 / T3 | Test 3 calls the upstream `saveScanDraft` with invalid layers and a mutated array. | Delete. Upstream follow-up (with `scan-draft` store tests). | Low |
| 2 | 6 | T6 | `seed()` writes a draft with text layers through the store API, because there is no UI way to get positioned lines without real OCR. | Accept as a documented fixture (`harness/plugins/scan.ts` `seedScanDraft`), or produce the lines through the single real-OCR test. | Low |
| 3 | 11, 17 | T6-lite | The text layers are read back with `readScanDraft().textLayers`. | Assert through the UI instead: open Download searchable PDF and check that the replaced page is re-recognized while the other keeps its text. Test 2 already does this after the read. | none |

## Proposed end state
One "reviewed text in drafts" step in the Scan section, starting from a seeded draft with text layers. It covers reorder,
edit and keep, save, reload, and export without recognition. Cancel discards edits. Replacing or correcting one page
clears only that page's text. The store validation rules go upstream.
