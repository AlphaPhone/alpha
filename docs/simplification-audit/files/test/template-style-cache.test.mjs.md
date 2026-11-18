# test/template-style-cache.test.mjs
- Lines: 36 | Kind: transplant (slices `prototype/dc-lite.js` from `  function camel(` to `  function props(` and runs it in `vm` with JSDOM) | Verdict: DELETE
- Covers: `parseStyle` parses a style string once into a frozen shared object, and the cache never grows past `STYLE_CACHE_LIMIT` (4096; `dc-lite.js:25,60`). Duplicates: style parsing correctness is exercised by every rendered Playwright journey. Callers/importers: `npm test`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-15 | T2, T10 | Text-marker slice of a renderer file plus exported-by-assignment globals (`globalThis.limit = STYLE_CACHE_LIMIT`). | Delete. | none |
| 2 | 28-36 | — | The bounded cache is a memory safeguard (clear at limit). Losing a dedicated check is acceptable: the code is a two-line `if (size >= LIMIT) clear()`. | none | low |
| 3 | — | cost | Boots JSDOM twice. | Saved. | none |

## Proposed end state
Deleted. No replacement; template rendering is covered by the journeys. If `dc-lite.js` is split in stage F, the cache can
be a tiny exported helper, but it does not need its own test.
