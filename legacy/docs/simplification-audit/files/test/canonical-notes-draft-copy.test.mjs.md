# test/canonical-notes-draft-copy.test.mjs
- Lines: 88 | Kind: Quint-harness fixture reuse (imports `compileCanonicalNotesUi`/`createCanonicalNotesUiFixture` from `specs/quint/refinement/application/canonical-notes-feedback.mjs`, which compiles the real Notes UI with stub ports) | Verdict: DELETE (T4)
- Covers: "Copy draft" after a failed save copies title+body/checklist, keeps the draft and snapshot unchanged, and stale callbacks (changed version, token, hidden page, inactive view, retired owner) copy nothing. Duplicates: `test/browser/canonical-notes-draft-copy.spec.ts` (same refusal-then-success scenario, research §P3 pair list) and the Notes feedback Quint replay. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 19-37 | T4 | Identical scenario to `canonical-notes-draft-copy.spec.ts:4-41`. | Delete the host twin. | None |
| 2 | 20,36,40,52,57,72,78,87 | C3 | Each test hand-installs and restores `globalThis.document` (five copies). | Gone with the file. | None |
| 3 | 55-74 | T3 | Five stale-callback causes are fence permutations; the Quint feedback model owns those. Only "checklist copy format" (39-53) is a distinct visible behaviour. | Add the checklist case to the Playwright spec (`[x] Edited item`). | Low |

## Proposed end state
Deleted. `journeys/notes.spec.ts` (from `canonical-notes-draft-copy.spec.ts`) covers Copy draft for text and
checklist notes; stale-callback fencing stays in the `canonical-notes-feedback` refinement.
