# scripts/test-local-redaction.ts
- Lines: 192 | Kind: live end-to-end qualification (real local agent via `start-local-remote.ts`, real Cerebras provider, fetch preload records booleans only) | Verdict: KEEP as opt-in live test, MOVE to `test/live/redaction.test.ts`, SIMPLIFY
- Covers: secrets/PII never reach the provider in raw form (6 credential shapes, 7 content classes, streaming progress, after restart) and contacts are restored in replies. Duplicates: none (upstream secret/PII swap unit tests cover the swapper, not the wire). Callers/importers: `package.json` `agent:test-redaction` only; no workflow runs it (grep of `.github` finds nothing).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 186-190 | B5 | Writes `test-results/local-redaction/result.json` report object; nothing reads it; pass/fail is a hand-folded `report.passed`. | Use `assert` per case so the runner reports which leaked; drop the report file (keep only the retained-profile message on failure). | None |
| 2 | 109 | B1 | `catch {}` in the readiness loop swallows every error (including assertion failures on `paired.access`). | Catch only connection-refused / missing `owner-token` (ENOENT); let assertions throw. | Low |
| 3 | 74, 113-127 | C3 | `wait` and process-group `terminate` duplicate `test-local-digest-restart.ts:41,168`. | Shared poll/kill helpers. | None |
| 4 | 65-72 | C3 | Free-port probe (listen 0, close) duplicated across launchers/tests. | Shared `freePort()`. | None |
| 5 | 13 | T9 | `--live` flag guard; under a test runner use `test.skip` unless `ALPHA_LIVE_PROVIDER=1`. | Convert. | None |
| 6 | 91-95 | - | Uses the host `/api/auth/pair-code` + `/api/auth/pair` owner pairing of the local host (upstream API, not the retired hosted pairing UI). Keep. | - | - |

Runtime: minutes; real provider calls (needs key); not CI.

## Proposed end state
`test/live/redaction.test.ts` (~150 lines): one `test()` per class group, skipped without the live opt-in, shared spawn/poll/kill helpers, no result file. Owner decides whether a release checklist runs it.
