# test/browser/render-error-recovery.spec.ts
- Lines: 22 | Kind: Playwright, chromium; real UI, failure triggered through the development `alpha:force-render-error` event | Verdict: **MERGE** into `journeys/home-shell.spec.ts`
- Covers: a render failure shows the "Something went wrong" recovery dialog whose diagnostics contain no user content (typed note title) and no error message, and Reload returns to Home. Duplicates: its production counterpart is `production-surface.spec.ts` "production ignores the development render-failure hook" (keep both, they test the two sides of one gate). Callers/importers: imports `helpers/legacy-notes`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8 | A1 | Opens Notes through `openLegacyNotes` (deleted "Previous notes" source). | Use current Notes. | Low |
| 2 | – | – | One cheap test, unique behaviour (privacy of diagnostics). | Carry unchanged. | none |

## Proposed end state
One step in `journeys/home-shell.spec.ts`: type a private note title, force the dev render failure, check diagnostics omit it,
Reload returns Home.
