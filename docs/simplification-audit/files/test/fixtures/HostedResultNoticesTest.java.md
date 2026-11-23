# test/fixtures/HostedResultNoticesTest.java
- Lines: 48 | Kind: Java fixture, integration of staged `NoticeOwner` + `HostedResultNotices` with in-memory ports | Verdict: KEEP, MOVE to the Gradle JVM notices suite (absorbing `HostedNoticeWithdrawTest.java`)
- Covers: same-loop supersession withdraws only the earlier notice, a superseded notice is never reposted, Ask survives ledger recreation, acknowledgement cancels, owner change withdraws and refuses queued prior-owner results, renewal notice timing (final 24 h, timeout at expiry, 7-day cap). Duplicates: device `HostedResultNoticeInstrumentedTest` and `HostedResultsLifecycleInstrumentedTest` (Android posting); setup shared with `HostedNoticeWithdrawTest.java`. Callers/importers: `test/hosted-result-notices.test.mjs:12`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 38 | T1 | `SUPERSEDE_AFTER_MS==24*hour` asserts a constant. | Drop the line; the timeout behaviour is checked by `renewalTimeout`. | Low |
| 2 | 20, 41 | A7 | 1-argument `capture` (B36). | Use the two-argument form. | Low |
| 3 | 9-13 | D8 | 200-plus-character lines. | Split on move. | Low |
| 4 | name | D11 | "Hosted" results are the live Cloud Workflow digests, not the deleted hosted-agent pairing (D5); keep the class. | No change. | Low |

## Proposed end state
One Gradle `HostedResultNoticesTest` (supersession, acknowledgement, owner change, renewal timing, withdraw-shown,
silent-when-open), one storage/poster fixture. Both node wrappers deleted.
