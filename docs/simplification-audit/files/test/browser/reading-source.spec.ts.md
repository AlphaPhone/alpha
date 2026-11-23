# test/browser/reading-source.spec.ts
- Lines: 35 | Kind: Playwright, chromium; opens the review by importing `reviewBrowserReading` (T6); one test calls the upstream `readPublicPageSource` via `/@fs` with a patched `window.fetch`; two tests start a real Node HTTP server | Verdict: **MERGE** 5 cases into `journeys/browser.spec.ts` (reading section); **DELETE** the rest
- Covers: public HTML becomes inert article text (no cookies sent, no subresource requests, scripts not run); binary sources ask for paste; oversized sources are blocked; long text is truncated to 5,000 characters; late extraction cannot overwrite edits; Close aborts extraction; no-CORS and redirect sources leave paste usable; timeout leaves manual review. Duplicates: oversized/late-edit overlap `reading-sensitive.spec.ts`; streamed byte limit and UTF-8 are upstream `page-source.ts` behaviour (T5). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7 | T6 | `open()` imports `reviewBrowserReading`. | Open via Browser menu. | Low |
| 2 | 22-25 | T5 | Streamed-source byte limit and invalid UTF-8 tested on the upstream module with a fake `fetch`. | Delete; upstream follow-up. | Low |
| 3 | 26-28 | T8 | Timeout case waits for the real source timeout (up to 8 s). | Drop, or drive with `page.clock` if the timeout is renderer-owned. | none |
| 4 | 10-14, 17, 20, 30-35 | – | Inert extraction without credentials, late-edit protection, no-CORS server and redirect-not-followed are security-relevant and only covered here. | Carry these four plus "long text truncated" into the journey. | none |
| 5 | 15 | – | Binary/large loop: large duplicates reading-sensitive. | Carry binary only. | none |

## Proposed end state
Five steps in the browser reading journey (inert extraction with cookie/subresource checks, truncation, late edits kept, no-CORS
paste fallback, redirect not followed), all opened through the menu. File deleted.
