# specs/quint/refinement/application/notes-recorder-media-admission.md
- Lines: 30 | Kind: harness documentation | Verdict: MERGE into the header comment of `notes-recorder-media-admission.mjs`, then delete
- Covers: explains the NotesRecorderMediaAdmission replay (recorder waits for the saved-audio stop before opening the microphone).
- Duplicates: the `assumptions` array in the harness (lines 111-114) says the same. Referenced by nothing (grep of specs/docs/test/scripts: no hits).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-18 | A8 | Narrates history ("At baseline `13f7b2496d` ... The recorder now awaits"). | Keep only the current contract (lines 20-30) as a 5-line comment in the harness. | None. |

## Proposed end state
Removed; a short header comment in the harness states scope and bounds.
