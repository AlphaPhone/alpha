# specs/quint/refinement/application/appearance-preference-admission.md
- Lines: 27 | Kind: narrative note (bug history + harness description) | Verdict: DELETE
- Covers: history of a `?theme` preview bug "at baseline `5b60285d61`" and what the replay executes. Duplicates: harness `assumptions`. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-8 | A8 | Changelog ("At baseline 5b60285d61, startup ignored…"). | Delete. | None |
| 2 | 9-27 | – | Restates the behaviour the model already encodes. | Move the 3-line rule ("markers suppress echo writeback; explicit theme saves once after commit; storage refusal keeps session theme") into `AppearancePreferenceAdmission.qnt` as a comment if not already there. | None |

## Proposed end state
File removed.
