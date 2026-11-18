# test/browser/helpers/native-notes.ts
- Lines: 13 | Kind: Playwright fixture (seeds the legacy native Notes slot and selects "Previous notes") | Verdict: **DELETE** (D1)
- Covers: writes the legacy archive envelope `{version:1,archive:{v1,v2,daily},currentRaw}` into slot `notes-records:v1:device` and opens "Previous notes". Duplicates: `legacy-notes.ts` (same envelope, browser store). Callers/importers: `document-summary-note.production.spec.ts`, `native-speech.production.spec.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-12 | A1 (D1) | Targets the legacy Notes source deleted in stage A2. | Delete; the two production specs open agent Notes through `harness/plugins/notes.ts`. | Medium: `document-summary-note.production` is the production-lane coverage of "summary → note"; it must be migrated, not dropped. |

## Proposed end state
Deleted; its two callers use the canonical Notes fixture on the production bundle.
