# test/fixtures/agent-identity-canonical.test.ts
- Lines: 116 | Kind: integration test (bun). It loads the real upstream `AgentRuntime`, `buildCharacterFromConfig` and `applySandboxCharacterFromEnv` from the prepared pinned SDK, runs them with `scripts/agent-identity.ts`, and writes temporary profile files. Test 8 is source-text over `vendor` files. | Verdict: KEEP tests 1 and 4-7, owner question on tests 2-3, DELETE test 8. MOVE out of `fixtures/` into `test/agent/identity.test.ts`, and run it in CI or delete it.
- Covers: host launchers present the agent as "Alpha" while keeping the persisted `identityName`, so agent, room, world and server UUIDs stay stable. An ambiguous profile refuses. Config updates are atomic, keep unrelated settings and keep the canonical file. A stale or changed profile is refused without writes.
- Duplicates: `test/agent-identity.test.mjs` (launch-level checks, see its report). `test/product-character-host.test.mjs` overlaps the character side.
- Callers/importers: only `scripts/test-local-agent-source.ts:13` (`npm run agent:test`). No workflow and no other script runs `agent:test` (grep of `.github`, `scripts` and `package.json`), so this test never runs in CI.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 105-116 | T1, T5 | Test 8 regex/`toContain` checks over `vendor/.../eliza.ts` and `conversation-routes.ts` for room-seed template strings. | Delete. Tests 1-7 compute the seeds from real modules. | None |
| 2 | 34-50 | A1? | Tests 2-3 cover "known legacy selected agent gains only its stable identity binding" and a missing `default` flag. They back the `!explicit` branch of `agentIdentityConfiguration`, which migrates profiles that predate `identityName`. These are host launcher profiles (`start-local-remote.ts`, `start-combined-agent.ts`, `start-local-voice-agent.ts`, `start-reviewed-workflow-agent.ts`), not Android app data, so D1 does not settle it. | Owner question: do pre-`identityName` host profiles still exist? If not, delete these tests and the `legacy` branch in `scripts/agent-identity.ts`. | Low |
| 3 | 1, path | T9, D11 | A test lives in `test/fixtures/` and is reachable only through a script that CI never runs. | Move to `test/agent/identity.test.ts`. Run it from the merged upstream-source runner that `chunks/scripts-15.md` proposes (`scripts/run-upstream-source-tests.ts`), and add that runner to the resident CI lane. Otherwise delete it as dead coverage. | Medium: this is the only check that UUID seeds stay stable across the "Alpha" rename. |
| 4 | 31 | naming | The fixture factory is called `legacy()` but builds the ordinary saved-profile shape. | Rename to `savedProfile()`. | None |

## Proposed end state
- `test/agent/identity.test.ts` holds about 6 cases on real upstream runtime modules: the Alpha presentation keeps its IDs, a fresh profile is stable on restart, ambiguity is refused, the atomic write keeps settings, and a changed file is refused.
- It runs in CI through the single upstream-source runner.
- Test 8 is gone. Tests 2-3 depend on the owner's answer.
