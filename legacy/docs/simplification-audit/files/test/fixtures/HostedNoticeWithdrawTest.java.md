# test/fixtures/HostedNoticeWithdrawTest.java
- Lines: 41 | Kind: Java fixture, integration of staged `NoticeOwner` sources + `HostedResultNotices` with in-memory storage and poster ports | Verdict: MERGE with `HostedResultNoticesTest.java` into one Gradle JVM notices test
- Covers: hosted Workflow result notices: an open panel for the same scope posts silently, showing a run withdraws exactly the shown notices by key, a pending tap survives withdrawal, a withdrawn notice is never reposted, withdrawal is scope-bound. Duplicates: setup duplicated verbatim in `HostedResultNoticesTest.java:8-13`; device `HostedResultNoticeInstrumentedTest`. Callers/importers: `test/hosted-notice-withdraw.test.mjs:12`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-13 | C5 / T4 | Storage, poster, scope and `retain` helper are copied from `HostedResultNoticesTest`. | One test class, one fixture. | Low |
| 2 | 23 | A7 | Uses the 1-argument `capture(String)`, which delete-candidates B36 lists as test-only. | Switch to the two-argument form when B36 lands. | Low |
| 3 | importer | P6 | Importer stages patched native and runs javac by hand. | Goes with the Gradle move. | Low |

## Proposed end state
Methods `withdrawShownRuns` and `openPanelPostsSilently` in a Gradle `HostedResultNoticesTest`. Fixture and node wrapper deleted.
