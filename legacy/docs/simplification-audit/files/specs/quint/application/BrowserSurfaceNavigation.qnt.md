# specs/quint/application/BrowserSurfaceNavigation.qnt
- Lines: 81 | Kind: Quint model (live, 5 runs, invariants + 3 witnesses, 7 symbol pins) | Verdict: KEEP
- Covers: one tab of the web build's iframe browser surface: each host navigation gets a fresh frame, only that frame's first load commits, stop/inner navigation/closed tab never commit, history position stays in range. Duplicates: none. Callers/importers: manifest (source `apps/app/src/browser/browser-surface.ts`, the web `AlphaBrowser` plugin registered by `browser/register.ts`); harness `browser-surface-navigation.mjs` (61 lines) bundles the real module (`loadBundled`) into JSDOM; only `test/quint-browser-surface-navigation.test.mjs` runs it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | — | D6 | Models the web build's surface only (Android uses the native plugin). Kept under D6/D19 while Playwright drives it. | See chunk owner question on web-only twins. | — |
| 2 | manifest | T10 | Symbol pins `load`, `navigate`, `command`, `committed`, `navigation` are common words matched by regex. | Drop `symbols`; the harness import already fails if the module changes shape. | None |

## Proposed end state
Unchanged model and harness (already import-based); manifest without word pins.
