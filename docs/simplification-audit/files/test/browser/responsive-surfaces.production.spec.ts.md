# test/browser/responsive-surfaces.production.spec.ts
- Lines: 399 | Kind: Playwright journey (`production` project, flag-off bundle, no bridge stub; storage-seeded), 12 tests | Verdict: **MERGE** with `responsive-surfaces.spec.ts` into a "responsive layout" section of `journeys/accessibility.spec.ts` (production file `journeys/accessibility.production.spec.ts`), with the Notes cases moved to `journeys/notes.spec.ts`
- Covers: the production renderer keeps density, a readable 720 px column, 44 px targets, focus, caret and drafts, and the split-pane rules across a phone/landscape/tablet viewport matrix. It does this for Settings, Calendar (form, month picker, day columns, large-text agenda), Workflows, Files, Browser menu, Maps notice, Camera (one capture session) and Photos (grid and viewer fit), and Notes (split view, draft switching). Duplicates: `responsive-surfaces.spec.ts` (same helpers and the same Photos density check), `accessibility-sweep.production`, and the Calendar caret part of `review-visual-viewport.spec.ts`. Callers/importers: none. It imports `helpers/canonical-calendar`, `helpers/legacy-notes`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2, 24, 69 | A1 (D1) | `openLegacyNotes` selects the legacy "Previous notes" source, which is deleted in stage A2 (`helpers/legacy-notes.ts` report). Tests 1, "Notes opens beside its list" and "switching notes" depend on it. | Switch to the canonical Notes fixture (`helpers/canonical-notes.ts` → `harness/plugins/notes.ts`). Move the two Notes tests (276-342) to `journeys/notes.spec.ts`. | High: they break when A2 lands. |
| 2 | 22 | A1 / C6 | Seeds `alpha.connection.selection.v1` as `{kind:'offline',localApps:true}`. `localApps` is an old shape that `Selection` (`connection-ui.tsx:84`) no longer has. The key literal is repeated across specs. | `{kind:'offline'}` from the harness constant. | none |
| 3 | 11-49 | C3 | `box`, `resize`, `expectColumn`, `expectTarget`, `inert`, `PORTRAIT…TABLET_*`, `COLUMN` are copied in `responsive-surfaces.spec.ts`. | Use `harness/layout.ts`. | none |
| 4 | 307, 376 | T6 | `probe()` writes `font-size` straight onto `[data-alpha-text-probe]` to fake large text. | Use the shared production text-scale helper (see `accessibility-sign-in.production` report). | Low |
| 5 | 93,112,175,222,259,304,390 | B5 | Seven screenshot loops write PNGs that no assertion or job reads. | Delete them (Playwright already keeps a trace and screenshots on failure). | none |
| 6 | 238-245 | T4 | The Photos 4-column/12 px density check repeats `responsive-surfaces.spec.ts:115-132`. | Keep this production copy. | none |
| 7 | 266-274 | T7 | The Theme-target test is 8 lines and opens Settings again. | Fold into the Settings column test. | none |
| 8 | 184 | – | Geolocation is denied by redefining `watchPosition`. This is a legitimate browser-boundary fake. | Move to `harness/browser.ts` `denyLocation(page)`. | none |

## Proposed end state
One `describe('responsive layout')` in the production accessibility journey, using `harness/layout.ts`. It has about 9 tests:
density and arrangement, Settings column and focus (with Theme targets), Calendar form caret, month picker, Workflows and
Files column, Browser menu above dock, Maps notice, Camera single session and Photos fit, and Calendar columns with
large-text agenda. The Notes split and draft-switching tests move to `journeys/notes.spec.ts` on canonical Notes. No
screenshots, and there is no legacy Notes dependency.
