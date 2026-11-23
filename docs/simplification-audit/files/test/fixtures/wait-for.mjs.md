# test/fixtures/wait-for.mjs
- Lines: 7 | Kind: test helper (bounded macrotask wait) | Verdict: KEEP `waitFor`, MOVE to `test/support/wait-for.mjs`; delete `deferred`
- Covers: a wait that cannot starve timers and fails with a label after `limit` ms. Duplicates: 17 local `flush` and 27 `tick` spinners, 18 local `deferred()` copies (research `tests-host.md:297-298`). Callers/importers: `conversation-restore-safety`, `development-cloud-voice`, `local-conversation-cleanup`, `read-aloud-direct` (all DELETE) and `test/fixtures/isolated-native-campaign.mjs` (research: merge into release-build-aosp integration), so it survives.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7 | D4 | `deferred` is a one-line alias for `Promise.withResolvers()`. | Delete; callers use `Promise.withResolvers()`. | none |
| 2 | 3-6 | C3 | The right single wait helper for host tests. | Make it the one `waitFor`; replace local `flush`/`tick`/`until` spinners in surviving integration tests with it (T8). | none |

## Proposed end state
`test/support/wait-for.mjs` exporting only `waitFor`, used by every surviving host integration test instead of local spinners.
