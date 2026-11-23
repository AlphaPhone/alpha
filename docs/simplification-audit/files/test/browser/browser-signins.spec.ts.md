# test/browser/browser-signins.spec.ts
- Lines: 186 | Kind: Playwright, chromium, 9 tests; mostly real UI (s10 r58, 1 sleep) with a sandboxed `BrowserSurface` frame standing in for native WebView events | Verdict: MERGE into `journeys/browser.spec.ts`
- Covers: normal tabs and history persist across cold start; private tabs are labelled, never saved; Clear browsing data asks first and keeps bookmarks/private tabs; native pop-up/close/notice events; pop-up close returns to opener and the 8-tab cap; interrupted restore keeps the committed address; save-failure retry; clear cannot be overtaken by a held save. Duplicates: private-tab notice also in `journey-e-browser-credentials.spec.ts`. Callers/importers: chromium project only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 15-16 | P2 / B2 | `(window as any).Capacitor.isNativePlatform=()=>true/false` flips presentation mid-page; the native contract is reached by overwriting a global. | One harness option `platform:'android'|'web'` set before load. | Low |
| 2 | 43, 101, 105, 116, 121, 124 | P2 | Pop-up events delivered via `registerPlugin('AlphaBrowser').notifyListeners(...)` from an in-page import; `emit` helper defined twice (105, 124). | Typed bridge harness `bridge.emit('AlphaBrowser','tabOpened',…)`; define once. | Low |
| 3 | 24 | P2 | `saved()` reads `browsingSessionDocument` via `/src/browser/preference-documents.ts`. | Assert through History/Tabs UI after reload (already done in the same tests); keep at most one storage read through the harness. | Low |
| 4 | 92-95 | T6 | Constructs `new BrowserSurface().clearSiteData(...)` directly to check its error text. The UI half (no "Clear site data" in the web menu) is the user-visible behaviour. | Keep the menu assertion only. | None |
| 5 | 155-186 | P3 | `BrowserSurface.prototype.saveBrowsingState/clearBrowsingData` replaced to fail or hold. | Inject at the storage boundary (IndexedDB put failure / held transaction via harness `holdDocumentsTransaction`) or drop the two cases. | Medium: the held-save ordering race is only covered here. |
| 6 | 164 | T8 | `waitForTimeout(1000)` to prove no retry storm. | `page.clock` advance and count. | None |
| 7 | 28, 42, 69, 141 | T8 | `test.slow()` on four cases because each cold-starts. | One shared page per describe where state allows. | None |

## Proposed end state
`journeys/browser.spec.ts` (chromium, android presentation): tabs+history across cold start; private tab never saved; Clear browsing data (cancel, confirm, bookmarks kept); pop-up open/notice/close returns to opener; tab cap; interrupted restore keeps address; save failure shows one notice and recovers (storage-boundary injection). Web presentation: menu has no "Clear site data". About 90 lines with the shared navigate/menu helpers moved to `harness/browser-app.ts`. Delete this file.
