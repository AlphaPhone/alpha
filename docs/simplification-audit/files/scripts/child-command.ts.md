# scripts/child-command.ts
- Lines: 31 | Kind: helper (spawn a child, forward SIGINT/SIGTERM/SIGHUP, exit with the child's code/signal) | Verdict: KEEP (move to `scripts/lib/`)
- Covers: wrapper scripts (`run-node-tests.ts`, `with-test-mocks.ts`) behave like the command they wrap under Ctrl-C and in CI. Callers/importers: `scripts/run-node-tests.ts:3`, `scripts/with-test-mocks.ts:3`, and three self-respawning suites `scripts/test-cloud-subscription.ts:8`, `test-connection-history.ts:22`, `test-device-actions.ts:7` (re-exec themselves with `--import tsx`); test `test/node-test-runner.test.mjs`; `quint-lib.ts:34` list.
- Findings: the three `test-*.ts` callers disappear when shimmed suites move into `test/` as real `node:test` files run under tsx (research 2.1, T9); the remaining two callers justify it. It is the shared spawn helper research 2.3 wants others (`test/fixtures/child-suite.mjs`, inline runners in `test/adapter-contracts.test.mjs`) to reuse rather than re-implement.

## Proposed end state
Unchanged 31 lines at `scripts/lib/child-command.ts`, imported by `run-node-tests.ts` and `with-test-mocks.ts` only.
