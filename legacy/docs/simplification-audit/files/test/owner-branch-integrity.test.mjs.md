# test/owner-branch-integrity.test.mjs
- Lines: 67 | Kind: tooling (imports `compareIntegrity` from `scripts/owner/read-branch-integrity.ts`; spawns the script against a fake `gh` written to a temp dir) | Verdict: MERGE into `test/tooling/owner-tools.test.ts` if the script survives; DELETE with it otherwise
- Covers: the manual branch-integrity read-back flags enforcing rulesets that have bypass actors (exit 1), accepts `--allow-bypass`, and exits 2 when a ruleset detail or its bypass list is unreadable. Duplicates: `test/owner-incident-response.test.mjs:160-171` also tests `compareIntegrity` (sources, classic protection, evaluate-only). Callers/importers: `npm test` glob only; the script has no npm script or workflow caller (issue #658 step 4, owner-run).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1 | A8 | Header narrates the issue ("Issue #658 step 4"). | Replace with what the read-back checks. | None |
| 2 | 15-24 | T3 / T4 | Pure `compareIntegrity` unit case; the CLI cases below exercise the same verdicts through the real process. Overlaps `owner-incident-response.test.mjs:160-171`. | Keep only the process cases (49-67) plus the classic-protection and evaluate-only cases moved from the incident test. | Low |
| 3 | 27-42 | C3 | Fake-`gh` writer is a twin of the stalled fake `gh` in `test/ci-ruleset-readback.test.mjs`. | One `fakeGh(responses)` helper in the merged file. | Low |

## Proposed end state
Follows `scripts/owner/read-branch-integrity.ts` (scripts report: MERGE with `scripts/ci/read-required-checks.ts` into one branch-rules read-back, or DELETE both). If kept: one `describe('branch rules read-back')` in `test/tooling/owner-tools.test.ts` with three process-level cases (bypass exits 1 / allowed exits 0, unreadable detail exits 2, hidden bypass list exits 2) and the classic-protection case, sharing a `fakeGh` helper with the required-checks cases. If the owner no longer runs it: delete script and test together.
