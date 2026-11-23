# scripts/test-own-notice-question.ts
- Lines: 82 | Kind: source transplant (reads `apps/app/src/prototype/own-notice-question.ts`, strips imports/types, runs it in `vm` with a fake `reviewContentQuestion`) | Verdict: DELETE
- Covers: asking about Alpha's own notice: sensitive text refused, recheck/consume before drafting, changed source reports "This notification changed.", abort/cancel paths, third-party notices refused. Duplicates: `test/browser/reminder-notice-question.spec.ts` and `gmail-notice-question.spec.ts` (both assert "This notification changed."), Quint `specs/quint/application/OwnNoticeQuestion.qnt` with harness `specs/quint/refinement/application/own-notice-question.mjs`. Callers/importers: `test/own-notice-question.test.mjs` (child-suite shim).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-12 | T2 | Regex-strips imports and `export` from product source; breaks on any formatting change. | Delete. | None |
| 2 | 53-81 | T3 | Ten micro-cases of an 18-line module already modelled in Quint. | Delete; the two browser specs keep the user-visible behaviour. | Low |

## Proposed end state
Deleted with `test/own-notice-question.test.mjs`. If the browser specs lack "cancel during recheck sends no draft", add it to `journeys/notifications.spec.ts`.
