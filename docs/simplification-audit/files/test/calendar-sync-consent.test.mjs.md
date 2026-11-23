# test/calendar-sync-consent.test.mjs
- Lines: 20 | Kind: test 1 host-JVM unit (real `CalendarSyncConsent.java` + `test/fixtures/CalendarSyncConsentTest.java` via `runJvm`); test 2 source-text (index order of literal statements in `AlphaConnectionPlugin.java`'s `request(` method, regex on `calendarSyncConsent()`) | Verdict: KEEP test 1 (move to Gradle JVM test); DELETE test 2
- Covers: Google Calendar sync writes need native consent for the exact grant, account and calendar; the transport checks it before any connection. Duplicates: none. Callers/importers: `npm test` glob; fixture `CalendarSyncConsentTest.java` (only importer).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-10 | C3 | Host-JVM runner; fine but separate from Gradle. | Move `CalendarSyncConsentTest` into `android/app/src/test/...`. | None |
| 2 | 13-20 | T1 | Ordering check by `indexOf` of a 200-char literal line; any reformat (D9 Prettier is TS only, but Java edits) breaks it. | Delete. The ordering is a property of `AlphaConnectionPlugin.request`; cover it in an instrumentation or JVM test that calls the request path with a denied consent and asserts no connection was opened, if the owner wants it. | Medium: ordering loses coverage |

## Proposed end state
`CalendarSyncConsentTest` runs under Gradle. The source-order check is deleted; owner decides whether a behavioural
"denied consent opens no connection" test is worth adding to the plugin's JVM tests.
