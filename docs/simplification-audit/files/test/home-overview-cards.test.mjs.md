# test/home-overview-cards.test.mjs
- Lines: 167 | Kind: unit/render (esbuild-bundles `home-overview-cards.ts` + `home-cards.ts` + `locale-time.ts` with React into a temp file, renders static markup and regex-matches it) + one `node --import=tsx -e` child (lines 80-100, `hosted-digests.ts` retained-brief scope) | Verdict: DELETE
- Covers: Home agenda, brief and mail cards keep their selectors, states and accessible labels; empty cards are hidden; the retained brief is fenced to the bound connection scope. Duplicates: `test/browser/home-daily-overview.spec.ts` (calendar card, Inbox card, Brief "appears for retained owner results", "digest panel … withdraws it on disconnect", workflows card), `home-attention.spec.ts`, `home-brief-result.production.spec.ts`, `home-cards.test.mjs`. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14, 80-90 | T9 | Assertions run in a `node -e` template string; failures surface as JSON parse errors. 120 s timeout. | Delete. | Low |
| 2 | 15-26 | C3 | Private esbuild bundle + temp file + dynamic import (one of ~60 loaders). Notable cost: React bundle per run. | Delete. | Low |
| 3 | 41-42, 115-118 | T1-like | Asserts exact inline `style="…"` strings: a snapshot of styling, fails on any style move to CSS (D12). | Delete. | Low |
| 4 | 146-166 | — | "Home hides empty cards and shows Brief only with a result" is user-visible. | Already in `home-daily-overview.spec.ts:461` (empty Home) and `:339`; nothing to carry. | Low |
| 5 | 78-101 | — | Brief scope fence across accounts. | Covered by `home-daily-overview.spec.ts:406`; nothing to carry. | Low |

## Proposed end state
File deleted. Card markup is asserted through the Home journeys (`journeys/home-shell.spec.ts`), where the cards are
rendered by the real shell instead of a separate React bundle.
