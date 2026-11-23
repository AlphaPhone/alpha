# scripts/test-local-digest-restart.ts
- Lines: 204 | Kind: integration (four real Bun processes of the pinned upstream runtime, SIGKILL during inference, three restarts) | Verdict: KEEP, MOVE to `test/resident/digest-restart.test.ts` (keep `npm run agent:test-digest-restart`), SIMPLIFY
- Covers: a digest run killed mid-inference stays `outcome-unknown` and is never replayed; a later occurrence gets its own run; an overdue occurrence is recorded `missed` without inference; a source that lapses while down is `unavailable`; receipts and the future schedule survive a fourth process. Duplicates: none at process level (`test/browser/journey-d-digests.spec.ts` and `dev-digest-schedule.spec.ts` explicitly defer to it). Callers/importers: `package.json` `agent:test-digest-restart`; `.github/workflows/digest-restart.yml` (dispatch, or weekly/main-push when `DIGEST_RESTART_AUTOMATIC=true`); `test/digest-restart-input.test.mjs` (spawns it with bad inputs); comments in the two browser specs.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 200-202 | B5 | Writes `result.json` with constant booleans (`preservedSameRun:true`, `notEvidenceFor:[...]`, `unchecked:[...]`) after the asserts already passed; nothing reads it. Each phase also writes `recovered.json`/`overdue-result.json` fields that only restate asserts. | Keep only the inter-phase handoff files (`admitted`, `overdue`, `lapsed`, `overdue-result.runId/nextRunAtMs`); drop `result.json` and the boolean fields. | None |
| 2 | 11-38 | C1 | Nine local interfaces re-declare upstream `plugin-workflow` / core runtime shapes (`DigestWorkflowService`, `DigestRuntime`, `TriggerTask`...). | Import the upstream types from the prepared source (type-only) or keep one `DigestEngine` type. | Low |
| 3 | 41-47 | C3 | `sleep`, `until`, `readJson` twins (also in `test-local-redaction.ts`, `test-update-confirmation-platform.ts`, `native-test-fixture.ts`). | Shared `test/support/poll.ts` (`until(check, {timeout})`) and `readJson`. | None |
| 4 | 168-173 | C3 | `killOwned` (process-group SIGKILL ignoring ESRCH) is the same as `stop().terminate` in `test-local-redaction.ts:118-121`. | One `killProcessGroup(child, signal)` helper. | None |
| 5 | 154, 166, 200 | C3 | Reads `upstream.lock.json` commit by hand (one of ~30 readers) and calls `verifySource` twice. | Use the shared lock reader; verify once at the end is enough (start check already refuses). | Low |
| 6 | 150-166 | T9 | Preflight refusal (exit 2 with prepare instructions) is itself tested by `test/digest-restart-input.test.mjs`, which also asserts the npm script string (T1). | Delete `digest-restart-input.test.mjs` (T5/T1); keep the refusal. | None |
| 7 | 48-149 | D9 | One file is both the parent and four child phases selected by env vars; phase bodies are 20-40-statement lines. | Split the child into `digest-restart-child.ts`; the test file owns spawn/kill/assert. Format. | Low |

Runtime: needs the ~6 GB prepared runtime and Bun; up to 4 x 120 s phases; never in `npm test` or `verify`.
Workflow note: `digest-restart.yml` path filter must follow the move (`test/resident/digest-restart*.ts`).

## Proposed end state
`test/resident/digest-restart.test.ts` (parent, `node:test`, ~70 lines) + `digest-restart-child.ts` (~90 lines) using shared poll/kill/lock helpers. No result receipt. Still opt-in (prepared source), run by the dispatch-only `digest-restart.yml` and the npm alias. `test/digest-restart-input.test.mjs` deleted.
