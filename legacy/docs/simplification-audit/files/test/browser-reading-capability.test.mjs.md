# test/browser-reading-capability.test.mjs
- Lines: 177 | Kind: source-text (T1: ~40 regexes over 9 upstream Java files, `AlphaBrowserPlugin.java`, `browser-adapter.ts`, `template.html`, `native-reading-voice.ts`, an androidTest source) + transplant (T2: `dc-lite.js` with imports string-replaced, bundled and rendered with React/JSDOM) | Verdict: DELETE
- Covers: page reading runs only in an isolated world; the capability refusal comes first and uses shared copy; the renderer asks on Android only and shows a menu note; Read aloud/Ask about page menu guards. Duplicates: instrumented `BrowserIsolatedReadingInstrumentedTest`, `BrowserSensitiveReadingInstrumentedTest`, `BrowserReadingInstrumentedTest` (behaviour on a WebView); Playwright `reading-capability.spec.ts` (web build offers reading on committed pages, unavailable on blank/loading/stopped/external pages), `reading-review.spec.ts`, `reading-sensitive.spec.ts`. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1 | — | File header says it itself: "They show nothing about Android's behaviour." | Delete. | none |
| 2 | 31-87, 125-136 | T1, T5 | Regexes over `vendor/eliza/plugins/plugin-native-browser-surface` Java (`BrowserReadingWorld`, `BrowserReviewedReading`, `BrowserTabHostPlugin`, ...): pins upstream text, including exact one-line method bodies (line 73) and statement ordering by `indexOf` (84-85). | Delete; isolation rules belong to upstream host tests and the instrumented tests. | low |
| 3 | 53-62 | T1 | Checks that an androidTest file contains a channel name string. Test of a test (T5). | Delete. | none |
| 4 | 98-123, 139-177 | T2 | Rebuilds `dc-lite.js` with `.replace("import {iconStyle} ...")` / `.replace('import templateHtml ...')` and renders two `template.html` rows; any template line wrap breaks it. | Delete; menu guards are visible in Playwright. | low |
| 5 | 172-176 | T1 | "reading voice is on-device" asserted by absence of identifiers (`speechRoute`, `createCloudVoice`). | Delete; `audit-production-bundle` is the place for a forbidden-symbol rule if the owner wants one. | low |

## Proposed end state
Delete. Add to `journeys/browser.spec.ts` (native preview, bridge fake `readingSupport → {available:false}`): the Browser menu shows the "Page reading unavailable" note with the shared refusal text available to assistive tech, and Read aloud refuses before any speech request is made. Android isolation stays with the instrumented reading tests.
