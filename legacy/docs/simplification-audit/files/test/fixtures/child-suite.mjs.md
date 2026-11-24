# test/fixtures/child-suite.mjs
- Lines: 9 | Kind: support helper (spawns `scripts/<suite>` as a child of node:test) | Verdict: DELETE after the `scripts/test-*.ts` suites move into `test/` (T9)
- Covers: running a script-shaped suite with `NODE_TEST_CONTEXT` removed and reporting its output. Duplicates: 5 inline copies (`adapter-contracts.test.mjs:15-16`, `google-browser-auth.test.mjs:40`, ...; research P-dup table). Callers/importers: `test/agent-camera-capture.test.mjs`, `calendar-availability.test.mjs`, `connection-contracts.test.mjs`, `gmail-read-ahead.test.mjs`, `inbox.test.mjs`, `mail-html.test.mjs`, `own-notice-question.test.mjs` (all research verdict G: merge the script body into an integration test), and `test/test-helpers.test.mjs` (T5, delete).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T9 | Exists only because the real tests live in `scripts/test-*.ts`. | Move those bodies into `test/integration/*.test.mjs`; delete this and its inline copies. | Low |
| 2 | 3 | - | Default 60 s timeout per child; each spawn is a fresh Node + tsx startup (notable cumulative cost). | Gone with the move. | - |

## Proposed end state
Deleted once the seven wrappers' scripts are moved into `test/`. Until then, the five inline copies should import it instead of re-implementing it.
