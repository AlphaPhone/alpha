# test/camera-scanned-note.test.mjs
- Lines: 30 | Kind: transplant (slices `    if(key==='camera')value.saveScannedNote=`…`\n    return value;` from `prototype/camera-adapter.ts` and ` async saveCard(`…` async discardDraftAndReload(` from `prototype/canonical-notes-ui.ts`, runs both in `vm`) | Verdict: DELETE; canonical case → `journeys/camera-photos.spec.ts` (scan → Save to Notes)
- Covers: a scanned page's text goes to canonical Notes and its receipt; canonical failure never falls through to a legacy write; explicit legacy Notes mode keeps prior notes; unavailable Notes writes nothing. Duplicates: `test/browser/scan-document.spec.ts`/`scan-pdf.spec.ts` drive scan review (Notes save is reached in `scan-pdf.spec.ts`). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-7, 11, 15 | T2 | Two marker slices across two files. | Delete. | None |
| 2 | 25-29 | A1 | Cases for `notesSourceMode:'legacy'` (legacy Notes engine, D1). The adapter still has the branch (`camera-adapter.ts:195-196`); A2 deletes it. | Delete with the branch. | None |
| 3 | 18-24 | - | Canonical save with exact text and no hidden fallback. | Journey step: scan → Save to Notes → note with exact text appears; agent Notes fake failing → "Notes unavailable", no note. | Low |

## Proposed end state
Deleted together with the legacy branch in `saveScannedNote`. The camera/scan journey asserts the canonical save and
the failure message through the agent Notes fake (`harness/plugins/notes.ts`).
