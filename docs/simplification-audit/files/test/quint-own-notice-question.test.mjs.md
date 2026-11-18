# test/quint-own-notice-question.test.mjs
- Lines: 24 | Kind: Quint replay wrapper (`runOwnNoticeQuestionReplay`, JSDOM; driver strips `prototype/own-notice-question.ts` and siblings into `vm`) + one scenario using the driver's `createDriver` | Verdict: MERGE into `test/quint-refinement.test.mjs`
- Covers: the own-notification question review (open, notice changed, dismiss, compose, abort, recheck, consume) follows 89 OwnNoticeQuestion traces; composing for a changed notice leaves the review open and spends nothing. Duplicates: none for the replay (`inbox-coordinator-ports.mjs` imports only `compile`). Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-13 | T4 (none) | Only execution. | Register in the application index. | Low |
| 2 | 17-24 | — | Concrete regression on the real sheet. | Add it as a named step sequence in the driver campaign. | Low |
| 3 | — | T10 | Driver strips and `vm`-evaluates four product files. | PORT to bundled imports. | Medium |

## Proposed end state
Deleted; OwnNoticeQuestion (with the changed-notice case) registered in the application index.
