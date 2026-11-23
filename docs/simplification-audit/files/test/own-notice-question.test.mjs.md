# test/own-notice-question.test.mjs
- Lines: 5 | Kind: indirection (runs `scripts/test-own-notice-question.ts` as a child suite via `test/fixtures/child-suite.mjs`; that script is itself a transplant of `prototype/own-notice-question.ts` in `vm`) | Verdict: DELETE
- Covers: asking about Alpha's own notice: sensitive text refused, recheck/consume before drafting, a changed notice reports "This notification changed.", cancel/abort paths. Duplicates: `test/browser/reminder-notice-question.spec.ts`, `test/browser/gmail-notice-question.spec.ts`, Quint `OwnNoticeQuestion` (harness `specs/quint/refinement/application/own-notice-question.mjs`, run by `test/quint-own-notice-question.test.mjs` and the aggregate). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4 | T9 | Test is a shim around a `scripts/test-*.ts` suite. | Delete with `scripts/test-own-notice-question.ts` (its report: DELETE). | None |
| 2 | - | T2, T4 | The child suite strips and evals the product file; behaviour already covered by two Playwright specs and a live Quint model. | No replacement needed; fold the two notice-question specs into `journeys/notifications.spec.ts`. | Low |

## Proposed end state
Deleted along with `scripts/test-own-notice-question.ts`. Coverage stays with the notice-question journeys and the `OwnNoticeQuestion` model. When this file and the other shims are gone, `test/fixtures/child-suite.mjs` loses one importer.
