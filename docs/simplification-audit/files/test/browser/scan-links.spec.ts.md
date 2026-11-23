# test/browser/scan-links.spec.ts
- Lines: 25 | Kind: test 1 is a Playwright journey on real local OCR with the entry by importing `scan-review.ts` (T6); test 2 mounts `createScanLinkReview` directly (unit); 2 tests | Verdict: **MERGE** test 1 into `journeys/camera-photos.spec.ts` (Scan section); **DELETE** test 2
- Covers: links recognized in scanned text appear only in a collapsed review, follow the edited text (`javascript:` is never linked), make no request until clicked, ignore a stale anchor, and open without `window.opener`. Test 2: a closed scan retires its link controls. Duplicates: test 2's behaviour is already asserted in test 1 (the `oldScanLink` stale click, line 14). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 20-25 | T3 / T6 / T4 | It unit-tests `createScanLinkReview` with a hand-built `active` flag, and test 1 covers the same retirement. | Delete. | none |
| 2 | 5-7 | T6 | The entry is a module import with a canvas image. | Use the harness `scanImage` entry. With `stubOcr(page, 'https://example.com/scan')`, the real OCR run is not needed. | none |
| 3 | 16 | B5 | Screenshot with no consumer. | Delete. | none |
| 4 | 4, 17 | – | `context.route(/^https:\/\//)` and the popup `opener===null` check are good security assertions. | Keep. | none |

## Proposed end state
One "links in scanned text" step: collapsed until opened, edits update the single link, `javascript:` is not linked, a
stale anchor makes no request, and a click opens a popup with no opener. It uses stubbed OCR.
