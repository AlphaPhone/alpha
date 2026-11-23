# test/browser/scan-keep.spec.ts
- Lines: 42 | Kind: Playwright spec (`chromium`); mounts `openScanReview` with an injected Keep callback (T6 component harness), `stubOcr`; 2 tests | Verdict: **MERGE** into `journeys/camera-photos.spec.ts` (Scan section), driven from Camera
- Covers: Keep on an unsaved scan-mode capture. An unconfirmed Keep that the host marks retryable offers "Try keeping again", which keeps the photo once (2 calls). An unconfirmed Keep that could duplicate the photo disables Keep (forced click makes no call). Duplicates: none found; `camera-adapter.ts` supplies the real Keep. Callers/importers: none. It imports `helpers/ocr-stub`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-21 | T6 | The review is mounted with a fake Keep function that throws `ScanKeepError`, so the camera-adapter wiring that maps the native Photos answer to `ScanKeepError` is never run. | Drive it from Camera in scan mode with `harness/plugins/photos.ts` answering the save (unconfirmed-retryable, then saved; unconfirmed-final). | Medium: it needs a photos plugin mode that returns the unconfirmed outcomes. |
| 2 | 40 | – | `keep.click({force:true})` on a disabled button is a fine "no second call" proof. | Keep. | none |

## Proposed end state
One parametrised step in the Scan section, "unconfirmed Keep" × {retryable, final}. It goes through Camera and the
photos plugin and asserts the status text, the button state and the native save-call count.
