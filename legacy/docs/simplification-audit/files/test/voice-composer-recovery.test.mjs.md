# test/voice-composer-recovery.test.mjs
- Lines: 19 | Kind: unit (real `apps/app/src/prototype/voice-activity.tsx` via `tsx`, `renderToStaticMarkup`, counts bars by regex) | Verdict: DELETE
- Covers: the full composer renders 35 voice bars and the compact pill 5, per phase. Duplicates: `test/browser/voice-composer-recovery.spec.ts` (same name; asserts `data-alpha-voice-bar` in the rendered app). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-19 | T4 | Host twin of a Playwright spec with the same name and the same markup assertion. | Delete; keep the spec (folded into `journeys/voice.spec.ts`). | Low |
| 2 | 15-16 | T3 | Exact bar counts are a visual constant, not behaviour. | Not carried. | Low |

## Proposed end state
File deleted.
