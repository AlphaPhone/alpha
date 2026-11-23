# test/browser/canonical-notes-checklist-labels.spec.ts
- Lines: 26 | Kind: Playwright, `chromium` project, UI journey over the canonical Notes fixture transport | Verdict: **MERGE** into `journeys/notes.spec.ts`
- Covers: checklist rows with blank or whitespace text get generic labels ("Remove item", "Check item"), exact text (including whitespace) is preserved in the inputs and the saved record, editing a row relabels it, removing a blank row saves the remaining items. Duplicates: none ("Remove item" appears only here). Callers/importers: none. Helper: `helpers/canonical-notes.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-26 | T7 | Single-test file with its own seed. | Add as the "checklist with blank and padded rows" step in the notes checklist test (`canonical-notes.spec.ts:231` "a checklist, pin and Back…" is the natural host). | Low. |
| 2 | 23 | none | Saved-record readback through `canonicalNotesFixture.state` is a fixture-boundary assertion. | Keep. | none |

## Proposed end state
Five or six assertions inside the notes journey's checklist test: labels for blank/whitespace rows, exact values, relabel
after edit, remove blank row, persisted items. Delete this file.
