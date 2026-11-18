# specs/quint/refinement/application/retained-reminder-tap-admission.md
- Lines: 28 | Kind: harness narrative note | Verdict: DELETE
- Covers: prose on post-render admission of a saved reminder notification token, a past bug at baseline `d7f851eca6`, scope. Duplicates: harness `assumptions` (`retained-reminder-tap-admission.mjs:63-65`). Callers/importers: none outside `docs/`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-13 | A8 | Baseline-hash bug narrative. | Delete. | None |
| 2 | 15-28 | T4 | Restates assumptions; calls the `reminderOpened` refresh path "legacy" although it is live (see `reminder-open-intent.md` report). | Delete; one scope sentence in the `.qnt` header. | None |

## Proposed end state
File deleted.
