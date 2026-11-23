# test/test-helpers.test.mjs
- Lines: 30 | Kind: tooling test of test machinery (T5) | Verdict: DELETE
- Covers: `test/fixtures/source-text.mjs` (`located`, `normalizedSource`: slicing and normalising source text) and `test/fixtures/child-suite.mjs` (`runChildSuite`: spawns `scripts/*.mjs` suites). Duplicates: none. Callers/importers: `npm test`. Helper importers: `source-text.mjs` ← `photo-library.test.mjs`; `child-suite.mjs` ← `agent-camera-capture`, `calendar-availability`, `connection-contracts`, `gmail-read-ahead`, `inbox`, `mail-html`, `own-notice-question` tests.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-19 | T5, T1 | Tests the source-slicing helper that T1/T2 deletions retire. | Delete now. | none |
| 2 | 21-30 | T5, T9 | Tests the child-suite spawner that exists only because test bodies live in `scripts/test-*.ts` (T9). | Delete now; the helper itself goes when its importers move their bodies into `test/`. | none |

## Proposed end state
Deleted. `source-text.mjs` and `child-suite.mjs` are deleted when their last importers are deleted or rewritten.
