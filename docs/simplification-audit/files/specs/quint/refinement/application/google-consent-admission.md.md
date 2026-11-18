# specs/quint/refinement/application/google-consent-admission.md
- Lines: 25 | Kind: prose note for the `google-consent-admission.mjs` campaign (that harness is in another chunk) | Verdict: MERGE into `google-consent-admission.mjs` header, then delete
- Covers: scope of `GoogleConsentAdmission` (readback belongs to the current Cloud binding and latest list/revoke; Gmail tier preserved with a send floor; Calendar consent uses a read floor). Duplicates: that harness's `assumptions`. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10 | B5 | "Sixteen source schedules compare 100 checkpoints". | Drop counts. | – |
| 2 | 20 | – | Lists "linked Calendar writes" as out of scope; consistent with D4. | Keep as one clause. | – |

## Proposed end state
No `.md`; two header lines in `google-consent-admission.mjs`. The model is live (manifest sources incl. `google-connection-ui.tsx`, `gmail-grants.ts`) and its harness imports `test/fixtures/google-account-panel.mjs`, which must therefore be ported, not deleted (see C3 correction).
