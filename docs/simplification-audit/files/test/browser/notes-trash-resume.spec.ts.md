# test/browser/notes-trash-resume.spec.ts
- Lines: 74 | Kind: Playwright spec, chromium, 2 tests, fake clock; legacy Notes Trash | Verdict: DELETE
- Covers: with the legacy source selected, a resume on Home and the shell's 15-minute timer purge expired text and voice Trash entries without opening Notes. Duplicates: expiry also in `notes-trash.spec.ts` and `notes-trash-recovery.spec.ts`. Callers/importers: none; imports `helpers/legacy-notes.ts`, `app-navigation.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2, 4, 10 | A1 | The header says it: "With the legacy source selected". | Delete. | None |
| 2 | 23-27 | T6 | Seeds legacy store and audio store via `/src` imports. | n/a. | None |
| 3 | 71 | T8 | `page.clock.fastForward(15 min)`. | n/a. | None |

## Proposed end state
File deleted. If the 15-minute shell maintenance timer survives for another feature, that feature's journey asserts it.
