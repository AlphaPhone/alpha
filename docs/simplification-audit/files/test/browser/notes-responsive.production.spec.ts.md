# test/browser/notes-responsive.production.spec.ts
- Lines: 51 | Kind: Playwright spec, production project, 1 test; touch viewport, legacy Notes seeded via `openLegacyNotes` | Verdict: REWRITE as a step in `journeys/notes.spec.ts` on canonical Notes
- Covers: the Notes editor keeps a readable column (max ~721 px, aligned title and body), and the same textarea, value, selection and scroll position survive portrait/landscape resizes; checklist column also bounded. Duplicates: none. Callers/importers: none; imports `helpers/legacy-notes.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10 | A1 | `openLegacyNotes` (in production it seeds a retained legacy document) - the "Previous notes" source D1 deletes. | Use canonical Notes. The canonical fixture preloads `/src` modules, so it runs in the chromium (dev) project, not production; the layout is the same CSS. | Low |
| 2 | 21-24, 35-36 | ok | Concrete geometry bounds and same-element identity through resize. | Keep. | None |
| 3 | 26 | ok | Screenshot artefact. | Optional. | None |

## Proposed end state
One "editor survives rotation" step in `journeys/notes.spec.ts` (chromium, touch viewport): long draft, caret and scroll kept across two resizes, column width bounded, checklist toggle bounded. If the production project must keep a Notes check, it needs a production-safe canonical fixture (owner question).
