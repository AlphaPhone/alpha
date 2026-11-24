# test/browser/appearance-storage.spec.ts
- Lines: 61 | Kind: Playwright spec, chromium + firefox/webkit (`scripts/storage-specs.ts:22`), 9 tests, real Settings UI plus storage probes | Verdict: MERGE into `journeys/settings.spec.ts` (appearance section)
- Covers: theme choice (System/Light/Dark) persists, follows `prefers-color-scheme` when System, falls back to light on malformed/removed values without rewriting them, shows "Theme not saved" on a failed write, and syncs across tabs without echo writes. Duplicates: theme toggles in a11y sweep specs (dark/light screenshots). Callers/importers: `scripts/storage-specs.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14, 42 | P3 | `Storage.prototype.setItem` patched to count writes and to throw QuotaExceeded. The quota case is a real browser boundary; the write-counting is internal. | Keep the quota fault (or CDP quota); drop the echo counter. | Low. |
| 2 | 12-30, 36-40 | owner | Five tests are cross-tab behaviour. The product is one Android WebView; a second window exists only if the assistant surface runs as its own WebView. | Keep one cross-tab case only if the owner confirms multi-window; otherwise drop. | Low. |
| 3 | n/a | P8 | Runs on three engines. | Remove from `storage-specs.ts`. | None. |

Cases worth carrying: choose Dark → reload keeps it; System follows scheme changes and saved value stays `system`; malformed stored value falls back to light without overwrite; failed write keeps the session theme and shows "Theme not saved".

## Proposed end state
Four steps in `journeys/settings.spec.ts` (one test with `emulateMedia` toggles). File deleted. No `/src` imports were used here; keep it that way.
