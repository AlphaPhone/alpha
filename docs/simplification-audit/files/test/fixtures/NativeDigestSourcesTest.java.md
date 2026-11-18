# test/fixtures/NativeDigestSourcesTest.java
- Lines: 57 | Kind: Java fixture, integration (`NativeDigestSources` + `HostedResultNotices` + staged `NoticeOwner`, file-backed storage in a temp directory, restart by re-construction) | Verdict: KEEP, MOVE to the Gradle JVM workflows-digest suite
- Covers: durable digest-source consent across restart, tenant/enrollment fences, revocation and expiry during a read, selected-calendar scope, reminder projection (morning/evening templates), DST windows, 7-day consent cap, model-egress refusal, 30-minute occurrence admission. Duplicates: none. Callers/importers: `test/native-digest-sources.test.mjs:20`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 33-40 | A1 (open) | Rows with `legacyAlarm:true` are "upgraded legacy one-off alarms"; delete-candidates B43 keeps the reader because upstream still declares `legacyAlarm` (Q-LEG-4 open). | Keep the case until Q-LEG-4 is answered; then delete it with the fallback. | Low |
| 2 | 12 | C3 | Storage names files by `HostedResultNotices.hash` (the misattributed SHA helper). | Use the shared `Digests` helper when U-L8 lands. | Low |
| 3 | 10-56 | D8 | Many 300-plus-character lines; one `main` with ~20 scenarios. | Split into named test methods on move. | Low |

## Proposed end state
A Gradle `NativeDigestSourcesTest` with one method per scenario group (consent/restart, fences, expiry, projection,
DST, admission window). Node wrapper deleted.
