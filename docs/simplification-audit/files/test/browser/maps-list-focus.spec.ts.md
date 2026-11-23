# test/browser/maps-list-focus.spec.ts
- Lines: 63 | Kind: Playwright journey plus Quint-flavoured evidence ceremony (imports `captureInputs` from `specs/quint/refinement/check-traces.mjs`); project `chromium`, 2 tests | Verdict: **MERGE** into `journeys/maps.spec.ts` (keyboard/focus block), without the trace ceremony
- Covers: keyboard focus stays on the same Maps result row (the same DOM node) when the provider inserts an earlier result, and on the same saved place when another saved place is removed; Enter then opens that row. Duplicates: `browser-list-focus.spec.ts` and `notes-photos-list-focus.spec.ts` cover the same `keyed-list-focus.ts` mechanism in other views; the Quint refinement `specs/quint/refinement/application/list-focus.mjs` covers the mechanism in JSDOM. Callers/importers: none. Nothing reads the `maps-provider-focus` / `maps-saved-focus` JSON it attaches (grep over `specs`, `scripts`, `test`: no hits).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-7, 15-18, 35, 46, 50, 62 | B5 / T10 | Hashes 10 source files (product, `.eliza` upstream, and itself) before and after, asserts the hashes are equal, and writes "checkpoint" JSON no consumer reads. It fails only if a file is edited during the run. | Delete the hashing, `observe` checkpoints and attachments; keep the user-visible assertions. Removes this spec's import of the Quint checker. | none |
| 2 | 24-26, 40 | T6 | Captures the controller by patching `MapsController.prototype.search` and calls `controller.search` directly to simulate a re-search. | Re-submit the search through the searchbox (Enter) after changing the provider fixture's result list. | Low |
| 3 | 52, 56 | T6 | `controller.save` / `controller.removeSaved` called directly. | Save via the place sheet's Save action and remove via "Remove from saved" in the UI. | Low |
| 4 | 23, 29 | T6 | `configureMapsProvider` installed from `/src/maps/runtime.ts`. | Shared Maps provider fixture. | Low |

## Proposed end state
Two short tests in the focus block of `journeys/maps.spec.ts`: "re-search keeps the focused result" and "removing another
saved place keeps focus". They are driven only by keyboard and UI controls, with the provider fixture's results changed between
searches. No Quint checker import, no hashing, no attachments.
