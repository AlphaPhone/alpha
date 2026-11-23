# scripts/test-local-agent-source.ts
- Lines: 15 | Kind: tooling (runs four upstream `bun test` files in the prepared pinned source plus Alpha's `test/fixtures/agent-identity-canonical.test.ts`) | Verdict: MERGE into `scripts/run-upstream-source-tests.ts` (with `test-device-timing-source.ts`) and wire it into the resident CI qualification step; otherwise DELETE
- Covers: upstream mobile workspace exports and workflow process-host integration tests; Alpha's canonical agent identity check against the prepared source. Duplicates: same prepare/sourceDirectory/presence-check pattern as `test-device-timing-source.ts`. Callers: `package.json:35` `agent:test`; no workflow runs `npm run agent:test` (grep over `.github/`, `scripts/`, `README.md`: none).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | — | A7/T9 | Never run by CI, so its result gates nothing. | Add the suite to the resident qualification step (source is already prepared there) or delete it. | M |
| 2 | 13 | D11 | `test/fixtures/agent-identity-canonical.test.ts` is a test living in `fixtures/`, only reachable through this script (grep: one reference). | Move to `test/upstream/agent-identity-canonical.test.ts` with the runner. | L |
| 3 | 7, 9-12 | C3/P3 | Re-prepares the source and repeats the runner-exists check of the sibling script. | One runner, one prepare. | L |
| 4 | — | T5 | Four of five files are upstream tests (D14). | Upstream follow-up. | — |

## Proposed end state
`scripts/run-upstream-source-tests.ts workspace` runs these five files; `resident-android.yml` calls it next to `device-actions`. This file is deleted. If the owner prefers not to spend resident CI time on it, delete the script and the npm alias, and keep only the identity test by moving it into an Alpha-owned lane.
