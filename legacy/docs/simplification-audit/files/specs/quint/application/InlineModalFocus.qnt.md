# specs/quint/application/InlineModalFocus.qnt
- Lines: 102 | Kind: Quint model (live, `specs/quint/application/manifest.json`) | Verdict: KEEP
- Covers: focus ownership of a phone-positioned modal: contained while top layer, Back only for the top layer, restore never steals and waits for a missing opener (`createInlineModal` in `apps/app/src/runtime/inline-modal.ts`). Duplicates: none. Callers/importers: `scripts/check-quint.ts` (scenarios + simulation, manifest family `application`); `test/quint-inline-modal-focus.test.mjs` (esbuild bundle + JSDOM; not in the aggregate)

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | test 12-13 | — | Bundles and imports the real module: target pattern. | None. | none |
| 2 | manifest symbols | T10 | Pins internal names (`ownsFocus`, `contain`, `assistantTarget`). | Pin the file. | L |

## Proposed end state
- Unchanged; manifest file pin.
