# test/browser/canonical-icons.spec.ts
- Lines: 59 | Kind: Playwright, `chromium` project (`?mode=dev` and `?mode=mock`), rendered-asset check; imports `apps/app/src/product/alpha-product-registration.ts` in Node | Verdict: **REWRITE** as steps in `journeys/home-shell.spec.ts` and `journeys/accessibility.spec.ts`; delete the rest
- Covers: Home tiles draw the published Lucide glyph they name (mask-image), every major app renders only `data-alpha-icon` icons from `/icons/lucide/` and no bespoke `svg.i`, Files folder/Back/storage icons, and Photos favourite/play badges use filled variants with a backplate. Duplicates: icon attribute checks also in `message-actions.spec.ts`, `message-reply-edit.spec.ts`, `voice-composer-recovery.spec.ts`; Files folder creation in the Files specs. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1, 20-26 | none | Reading the product registration to know which glyphs are published is a legitimate data import (no slicing). | Keep in the Home step: each tile's `data-mobile-shell-tile-icon` is in `record.icons` and its mask names it. | none |
| 2 | 45-55 | T1-adjacent | "No `svg.i` left in any view" is a hygiene guard on rendered markup, not behaviour; it exists to stop a regression to bespoke SVGs. | Fold into the accessibility sweep loop (it already visits every view in both themes) as one assertion per view: all visible `[data-alpha-icon]` resolve to `/icons/lucide/*.svg`. Drop the `svg.i` count. | Low. |
| 3 | 29-42 | T4, T7 | Files: create a folder through the UI just to check its icon, then two screenshots to the same path (`folders-<theme>.png` written twice, lines 38 and 42). | Drop; Files journey creates folders already. If the folder icon matters, one `toHaveAttribute` in `journeys/files.spec.ts`. | none |
| 4 | 57-59 | T7 | Photos badges in mock mode, one long line. | Move to `journeys/camera-photos.spec.ts` (library grid step) as one assertion per theme. | Low. |
| 5 | 28,33,38,42,52,58 | B5 | Seven screenshots nothing compares. | Drop. | none |
| 6 | 8-10,16-17,40 | A8 | Comments describing file locations (`prototype/home-shell.ts`). | Drop on move. | none |

## Proposed end state
`journeys/home-shell.spec.ts`: one step per theme asserting every Home tile names a published glyph and draws it.
`journeys/accessibility.spec.ts` sweep: per view, every visible icon is from the Lucide pack. `journeys/camera-photos.spec.ts`:
filled favourite and play badges. Files folder icon only if Files journey needs it. Delete this file.
