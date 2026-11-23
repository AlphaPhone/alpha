# test/browser/scan-review-navigation.ts
- Lines: 5 | Kind: Playwright helper (opens the "Draft options" disclosure in the scan document dialog) | Verdict: **MERGE** into the Scan section of `journeys/camera-photos.spec.ts` as a local helper (or `harness/nav.ts` if another journey needs it)
- Covers: no behaviour. It clicks the `.scan-draft-options` summary if it is not open. Duplicates: one of four navigation helpers (`app-navigation.ts`, `workflow-navigation.ts`, `inbox-draft-navigation.ts`, this one; research). Callers/importers: `scan-correction`, `scan-draft`, `scan-edges`, `scan-native-page-camera`, `scan-text-draft` (5 specs, all merging into the same Scan section). No script, workflow or Quint harness references it (grep).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3 | – | It selects by CSS class `.scan-draft-options`, not by role. | Use `dialog.getByRole('group')` or the summary text "Draft options" when moved. | none |

## Proposed end state
The file is deleted. `openDraftOptions(page)` is a three-line local function in the Scan section.
