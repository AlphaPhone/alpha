# specs/quint/refinement/services/web-reading-review.mjs
- Lines: 103 | Kind: Quint replay harness (import-based: `loadBundled` of the real module in jsdom, two port stubs) | Verdict: KEEP, SIMPLIFY
- Covers: replays `WebReadingReview.qnt` (4 scenarios, 3 witnesses, 40 random traces × 30 steps) against the real `reviewBrowserReading` dialog (`apps/app/src/browser/reading-review.ts`): it refuses sensitive pages and text, Read waits for the page source, Stop and stale speech ends, typed text is kept, and the dialog closes through any of six exits. Duplicates: Playwright `test/browser/reading-review.spec.ts`, `reading-sensitive.spec.ts` and `reading-source.spec.ts` drive the same dialog through the UI. They cover the user path, but not the speech-generation races this harness replays. The campaign also runs twice, from `test/quint-web-reading-review.test.mjs` and from `forward-replays.mjs:26` (T4). Callers/importers: those two.

Model is live (manifest `WebReadingReview`, sources `apps/app/src/browser/reading-review.ts`, `apps/app/src/prototype/browser-adapter.ts`; both exist). Reading review is a production browser feature, not a deleted one.

Text and stub dependencies (no slicing). Stub keys are literal import specifiers in `reading-review.ts:3-4`: `'../../../../.eliza/client-features/plugins/plugin-native-browser-surface/src/page-source.ts'` and `'../local-speech-playback'`. The harness also imports the upstream rule module through a deep relative path (line 13). DOM anchors: `dialog[aria-label="Read page excerpt"]`, `footer button` ×3 with labels `Read locally`/`Stop reading`/`Close`, status text `Contains secrets`, and the `alpha-back` window event.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 22-25 | T5 | Four asserts check the upstream `sensitiveReadingUrl`/`sensitiveReadingText` rules on fixture strings. They test `vendor/eliza` rules, not this dialog. They are a precondition for choosing fixtures, but they fail for upstream reasons. | Keep only as a one-line fixture guard, or delete and let the upstream suite own the rules. | Low |
| 2 | 13, 27-28 | D13 | Deep relative `.eliza/...` paths in the import and in the stub key. The stub key must match the specifier exactly as written in the product file, so introducing the `@eliza/*` alias (stage F) silently stops the stub from applying, and the real network fetch would run. | When the alias lands, change the stub key to the alias specifier, or key stubs by resolved path in `loadBundled`. Record this in cross-file actions. | Medium (silent) |
| 3 | 71, 75-82 | — | `endings++ % 3` and `finishes++ % 6` rotate the ways speech ends and the review closes across traces. This gives deterministic coverage of every exit without extra model actions. | Keep. Comment that the rotation is what covers all six exits. | — |
| 4 | 97-103 | T4 | Run by the owning test (which asserts exactly 47 traces, B5) and by the aggregate. | Run once. Make the owning test assert `> 0` actions, not exact counts. | None |
| 5 | 1-10 | — | Doc comment is accurate and describes the abstraction. | Keep. | — |

## Proposed end state
About 95 lines, unchanged in approach. It is already the target pattern: the real module is bundled and only ports are stubbed. Stub keys should not depend on relative specifier spelling, so `loadBundled` matches stubs on the resolved file path. The upstream-rule asserts are dropped. One CI lane runs it when `browser/reading-review.ts`, `local-speech-playback.ts`, `WebReadingReview.qnt` or `.eliza` page-reading sources change.
