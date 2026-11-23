# android/app/src/main/java/ai/alphacompute/alphaphone/NativeDigestSources.java
- Lines: 87 | Role: durable per-source digest consent (approve/revoke/current) and the bounded morning/evening read of selected calendars and reminders | Verdict: SIMPLIFY
- Importers: `NativeDigestHost` (main); androidTest `WorkflowPhoneNativeInstrumentedTest`, `WorkflowLegacyReminderUpgradeInstrumentedTest`; `SourceRenewalHost` uses `SourceChanged`. Text/path pins: `test/fixtures/NativeDigestSourcesTest.java` + `test/native-digest-sources.test.mjs` (javac), `test/resident-result-transport.test.mjs`, `specs/quint/native/manifest.json`, `specs/quint/refinement/native/{NativeDigestTraces,SourceRenewalTraces}.java`, `hosted-inbox.mjs`, `native-digest*.mjs`, `source-renewal*.mjs`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10 | C1 / C4 (P7) | Product-local `interface Storage {read(key); write(key,value)}` — one of six local copies of the slot interface. | Use the shared slots interface. | Low; tests construct `new NativeDigestSources.Storage(){…}`. |
| 2 | 15 | C1 | `interface Guard {void check()}` — 7 twins (`HostedInbox.Fence`, `HostedTransport.Guard`, `ResidentCredentialShutdownRetry.Guard`, `ResidentResultSession.Guard`, `AlphaCanonicalNotifications.ForegroundCheck`, …). | One shared `Guard` functional interface. | Low. |
| 3 | 64 | A7 / D7 | 7-arg `read(…, reader, guard)` defaulting to `"morning"` has no production caller (`NativeDigestHost` calls the 8-arg form); callers are `test/fixtures/NativeDigestSourcesTest.java:19` and `WorkflowLegacyReminderUpgradeInstrumentedTest.java:44`. | Delete; tests pass `"morning"`. | None. |
| 4 | 19-20 | D7 | Two constructors; the `LongSupplier clock` one is used only by the host test (`NativeDigestSourcesTest:15,17`); production passes `System::currentTimeMillis`. | Keep one constructor taking the clock; `NativeDigestHost` passes `System::currentTimeMillis`. | None. |
| 5 | 79-80 | A1 (suspicion) | "Upgraded one-off alarms (legacyAlarm, dueAt derived from at)": `row.has("dueAt")?millis(row,"dueAt"):millis(row,"at")`. Upstream reminders still declare `legacyAlarm` (`.eliza/client-features/plugins/plugin-native-reminders/src/occurrence.ts:182,237`). | Check upstream `ReminderEngine.list()` always emits `dueAt` for this package; if so read `dueAt` only and delete the comment and `WorkflowLegacyReminderUpgradeInstrumentedTest`. | Medium (upstream-dependent). |
| 6 | 21-22 | A8 | Two stacked Javadocs; the first ("Reviewed consent lasts at most 7 days…") belongs to `MAXIMUM_EXPIRY_MS` but sits above `SourceChanged`. | Move/merge comments. | None. |
| 7 | 39, 41, 53, 55, 57, 62, 73-81 | D8 | 10 lines over 200 chars, the reminder loop is one 900-char line. | Format; extract `eveningCompletions(row, …)` and `openReminder(row, …)` from the loop. | Low. |
| 8 | 51 | D8 | `id(new JSONObject().put("id",sourceId),"id")` builds a throwaway object to validate a string. | `requireId(String)` overload. | None. |
| 9 | 47, 54, 62 | C3 | SHA-256 via `HostedResultNotices.hash`. | Shared `Digests.sha256Hex`. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `Storage` | interface | 10 | `HostedInbox.Store`, `HostedResultNotices.Storage`, `SourceRenewalNotices.Store`, `GoogleWorkspaceReturnFlow.Store`, `WorkflowNoticeDelivery.Storage` | shared slots interface |
| `Guard` | interface | 15 | 7 copies | shared `Guard` |
| `Reader` | interface | 11-14 | — | here |
| `SourceChanged` | exception | 23 | `SourceRenewalNotices.RenewalStale` (mapped from it) | here |
| `keys(...)` exact key-set check | helper | 34 | `NativeDigestHost:18-19`, `NativeNotificationSession:19`, `PreparedViewNavigation:14-15`, `ResidentResultTransport:61`, `SourceRenewalNotices:19` | `Json.requireExactKeys` util |
| `UTC` formatter | const | 32 | — | here |

## Proposed end state
Same persisted grant format (`native-digest-source:v1:<hash>`). One constructor, one `read`, shared slot/guard interfaces, reminder
loop split into two named helpers. ~80 logical lines (more physical lines once formatted).

## Verification
`test/native-digest-sources.test.mjs`, Quint native-digest/source-renewal refinements, `WorkflowPhoneNativeInstrumentedTest`.
