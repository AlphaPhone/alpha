# test/browser/reading-sensitive.spec.ts
- Lines: 49 | Kind: Playwright, chromium; source-text harness + module-in-page: slices the `EXTRACT` Java text block out of `vendor/eliza/.../BrowserPageReading.java` and `eval`s it, imports the upstream `page-source.ts` through `/@fs`, calls `reviewBrowserReading` directly and patches `BrowserVoice.prototype.synthesizeLocal` and `window.fetch`; ~27 generated tests | Verdict: **REWRITE**: delete the native and upstream halves; carry 4 user-visible refusals into `journeys/browser.spec.ts`
- Covers: reading refuses pages, pastes, URLs and query keys that look like credentials (API key, tokens, vault, OTP, recovery codes, normalised/zero-width variants), excludes interactive content, blocks oversized sources, and a late refusal cannot be bypassed by editing while extraction is pending; and that the vendor Java extraction script agrees. Duplicates: the classifier and page-source reader live upstream (`plugin-native-browser-surface`) and belong to its tests; the Android side is `BrowserReadingNavigation` instrumentation; `reading-source.spec.ts` overlaps the oversized/late-edit cases. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6, 12, 21-23, 38 | T1 / T10 / T5 | Reads vendor Java source text, splits on `public static final String EXTRACT = """`, un-escapes and evals it. Tests upstream code by slicing its text; breaks on any upstream reformat. | Delete. List as an upstream follow-up (D14): the JS extraction belongs in upstream tests or Android instrumentation. | Low here; owner should confirm native extraction is covered on device |
| 2 | 4, 18, 37 | T5 | Calls the upstream `readPublicPageSource` through `/@fs/.eliza/...`. | Delete; upstream unit coverage. | Low |
| 3 | 10-11, 27, 31, 33, 41, 47 | T6 | Every case opens the review by importing `reviewBrowserReading` and patches `BrowserVoice.prototype.synthesizeLocal` or `window.fetch`. | Open via Browser → Menu → Read aloud on a route-fulfilled page; count speech through `voice-fixture`. | Low |
| 4 | 7, 45 | T7 | 10 body cases + 6 query-key spellings + 3 URLs + 3 controls: a classifier truth table in an e2e harness. | Keep one representative per user-visible rule in the journey; the full table belongs upstream. | Low |

## Proposed end state
In `journeys/browser.spec.ts` (reading section): (1) an article containing "Recovery codes" is refused with "Contains secrets" and
nothing is spoken; (2) a sensitive address (`/%70assword`) is refused before any fetch; (3) a pasted credential is refused while a
normal excerpt reads; (4) a late refused document cannot be bypassed by editing during extraction. The file is deleted.
