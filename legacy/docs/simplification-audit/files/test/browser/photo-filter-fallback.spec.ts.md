# test/browser/photo-filter-fallback.spec.ts
- Lines: 9 | Kind: Playwright, chromium; module-in-page on a blank routed page (imports `/src/browser/photo-filter.ts`, compares `applyPhotoFilter` with `ctx.filter` on a 4×1 canvas) | Verdict: DELETE
- Covers: the pixel fallback for the six CSS colour filters stays within 3 levels of Chromium's native canvas filter and keeps alpha. Duplicates: `scripts/test-photo-filter-png-reference.ts` (the same six filters against Chromium's CSS chart, run as reference evidence), `browser-photo-edit.spec.ts` (filter applied through the editor UI). Callers: chromium only; no script names it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-8 | T3, T6 | No app, no user action: a unit test of one pure function in a browser costume. | Delete. | Low. |
| 2 | 6 | — | The fallback runs only when `'filter' in context` is false (`browser-camera.ts:120-122`), i.e. not in Chromium or the Android WebView; this test runs it only in Chromium, where the comparison is possible. | If the fallback is kept for WebKit, add one pixel assertion to `browser-photo-edit.spec.ts` on the webkit project instead. | Low. |
| 3 | 5 | C5 | The filter strings are a third copy (product `filters`, the PNG reference script). | Gone with the file. | None. |

## Proposed end state
File deleted. Owner question: whether the browser-only filter fallback (`apps/app/src/browser/photo-filter.ts`) is needed at all, since Android's WebView supports `ctx.filter`; if not, it and `scripts/test-photo-filter-png-reference.ts` go too.
