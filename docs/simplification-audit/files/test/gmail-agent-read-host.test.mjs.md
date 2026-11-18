# test/gmail-agent-read-host.test.mjs
- Lines: 389 | Kind: integration (real shared `createManagedGoogleAgentHost` composed by `scripts/gmail-agent-read-host.ts` over the real browser-profile credential handler; only `fetch` is faked) | Verdict: MERGE into `test/integration/inbox-gmail-google.test.mjs`
- Covers: owner-bound Gmail and Calendar reads for the agent: exact-review send with one dispatch, lost-response recovery by receipt, credential-generation and grant-revocation refusal, multi-account refusal, mailbox revision change, Calendar owner-check reuse window (monotonic and wall clock), shared lookups, per-account calendars, write receipt after a failed trailing check, size limits, sender identifiers. Duplicates: `test/native-google-agent-host.test.mjs` and `test/google-agent-access.test.mjs` drive the same shared host through `test/support/managed-google-agent.mjs`. Callers/importers: none (node test); it imports `scripts/gmail-agent-read-host.ts` (8 lines, dev-only composition used by `gmail-agent-dev-broker.ts`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8 | T9 | Re-spawns itself under `--import tsx`. | Run the integration suite with tsx once in the runner. | none |
| 2 | 9-10 | T5 | The logic under test is upstream (`.eliza/client-features/packages/app/src/runtime/managed-google-agent/*`); upstream has no tests of it. This file is its only coverage. | Keep (R6), and list the cases as an upstream follow-up (D14). | low |
| 3 | 15-49 | C5 | Fake Cloud server inline; `support/managed-google-agent.mjs` and `native-google-agent-host.test.mjs` build similar ports. | One fake Cloud transport in `test/support/`, used by the merged inbox-gmail-google suite. Run the cases against `support/managed-google-agent.mjs`'s host so the phone composition (not the dev broker) is what is tested. | low |
| 4 | 124-295 | — | Thirteen Calendar owner-lookup cases (window, sleep, wall clock back, leader abort, credential change). Valuable concurrency coverage. | Carry all; they are behaviour. | none |
| 5 | 119, 183-233 | T8 | `until()` polls every 1 ms; `performance.now`, `Date.now` and `setTimeout` are monkey-patched by hand. | Use `waitFor` and `mock.timers`. | low |
| 6 | 11, 17 | — | Couples to the generated `cloud-deployment.generated.ts` namespace for the profile path. | Fine (it is the real namespace). | none |

## Proposed end state
Its cases live in one inbox-gmail-google integration file that builds the shared host the way the phone does, with
one fake Cloud transport, standard waits and mock timers. `scripts/gmail-agent-read-host.ts` folds into
`gmail-agent-dev-broker.ts` (scripts research).
