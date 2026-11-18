# test/browser/scan-correction.spec.ts
- Lines: 31 | Kind: Playwright spec (`chromium`); every test opens the scan document by `import('/src/prototype/scan-document.ts').openScanDocument(blob)` (T6), and two tests call the upstream algorithm directly; 9 tests | Verdict: **MERGE** into `journeys/camera-photos.spec.ts` (Scan section); unit parts **DELETE** (upstream follow-up)
- Covers: perspective correction of a scanned page. Corner entry, drag, preview and adopt; draft save and reload with the corrected image; PDF export; invalid or changed corners cannot adopt a stale preview; Back cancels only the correction; decode cancellation; URL revocation on pagehide; compact layout in both themes. `correctScanPage` lives in `vendor/eliza/plugins/plugin-files/src/documents/scan-correction.ts` (the local `browser/scan-correction.ts` is a one-line re-export), and upstream has no test for it. Duplicates: `scan-edges.spec.ts` (preview/adopt/cancel retains bytes), `scan-text-draft.spec.ts` (adopting a correction). Callers/importers: none. It imports `scan-review-navigation`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3 | T6 | Entry by module import with a canvas blob, not Camera → Scan document. | Start the journey from Camera (native camera fake as in `scan-native-page-camera`) or Files → image → Scan. Expose `scanImage(page, blob)` in the harness, which goes through the UI picker. | Low |
| 2 | 5-8, 25-27 | T5 / T6 / T3 | "Projective sampling" pixel test and "invalid selections reject before decoding / yields to cancellation" call `correctScanPage`/`fullPageCorners` directly. These are unit tests of an upstream algorithm, and the second patches `window.setTimeout`. | Delete here. Record as an upstream follow-up (plugin-files has no scan-correction test; D14/R6). | Medium: the geometry has no other test until upstream adds one. |
| 3 | 15-17, 18-20 | T6 / B5 | Monkeypatched `createImageBitmap` and `URL.revokeObjectURL`, with an exact count `revoked.length===3`. These are resource-release assertions on internals. | Delete. | Low |
| 4 | 9-14, 22-24, 29-31 | – | Reviewed correction → save → reload → load → PDF; invalid corners and stale preview; Back cancels only correction; drag updates accessible coordinates; compact viewport fit. | Carry these as journey steps. Run compact fit in one theme only. | none |
| 5 | 13 | – | Back is `window.dispatchEvent(new Event('alpha-back'))`, which is how the native back key reaches the renderer. | Use `harness/nav.ts` `androidBack(page)`. | none |
| 6 | whole | D8 | Every test is one minified line. | Format when merged. | none |

## Proposed end state
In the Scan section of `journeys/camera-photos.spec.ts`, one "correct a page" test covers enter corners, invalid corners
blocked, reset, preview, change corners (preview cleared), drag a handle, adopt, save draft, reload, load and export
PDF. Back from correction returns to the document. A compact-viewport step covers fit. The algorithm tests go upstream.
