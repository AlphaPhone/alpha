# test/hosted-result-notices.test.mjs
- Lines: 15 | Kind: integration on host JVM (same staging and javac as `hosted-notice-withdraw.test.mjs`, fixture `test/fixtures/HostedResultNoticesTest.java`) | Verdict: KEEP as the MERGE target (then move to Gradle JVM `HostedResultNoticesTest`)
- Covers: hosted result notices supersede only their own loop's earlier notice, never repost a superseded/withdrawn result, cancel on acknowledgement, are withdrawn on owner/agent change, and renewal notices fire inside the final 24 h and withdraw at expiry. Duplicates: `test/quint-native-hosted-result-notices.test.mjs` (ledger traces), `hosted-notice-withdraw.test.mjs` (sibling). Callers/importers: `npm test` glob; `test/fixtures/native-source.mjs`, `jvm-tools.mjs`, fixture `test/fixtures/HostedResultNoticesTest.java` (48 lines, only importer is this file).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-14 | C3 | Duplicate plumbing of the sibling file. | Merge the sibling into this one. | Low |
| 2 | fixture 39-45 | — | Renewal timing (`renewalDelay`, `renewalTimeout`, 9-day refusal) is not in the Quint model as far as its receipt fields show. | Keep. | Medium |
| 3 | fixture 29 | B5 | `SUPERSEDE_AFTER_MS==24*hour` asserts a constant. | Drop that line. | Low |
| 4 | fixture 31 | A7 | Uses the 1-arg `capture` (B36). | Switch to the 2-arg form when B36 lands. | Low |

## Proposed end state
One JVM test of `HostedResultNotices` with named cases (supersession per loop, ack cancel, owner withdrawal, panel
withdraw, silent post, renewal window), minus anything the Quint traces already check.
