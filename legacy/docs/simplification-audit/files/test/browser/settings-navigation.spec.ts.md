# test/browser/settings-navigation.spec.ts
- Lines: 18 | Kind: Playwright journey (`chromium`), 1 test | Verdict: **MERGE** into `journeys/settings.spec.ts` (navigation step)
- Covers: Android Back (`alpha-back`) pops one Settings level at a time: Licenses → About → Settings → Home. Duplicates: `settings-page-accessibility.spec.ts` ("development license list restores focus to About" walks the same pages with the on-screen back). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3 | C3 | A local `back()` dispatches `alpha-back`. The same one-liner appears in several specs. | `harness/nav.ts` `androidBack(page)`. | none |
| 2 | 5 | T7 | A single-test spec. | Merge as one step with the license focus test: on-screen back restores focus; Android Back pops a level. | none |

## Proposed end state
One step in the settings journey: About → Licenses, then on-screen Back (focus returns to Licenses), then Licenses
again, then Android Back ×3 to Home.
