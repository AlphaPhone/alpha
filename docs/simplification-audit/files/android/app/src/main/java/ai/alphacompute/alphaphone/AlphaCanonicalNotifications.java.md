# android/app/src/main/java/ai/alphacompute/alphaphone/AlphaCanonicalNotifications.java
- Lines: 204 | Role: process-static resident notification transport: restores/ensures one owner-bound subscription to the resident's notification stream, hydrates pages into `NativeNotificationInbox`, posts via `NativeNotificationProjector`, and holds/acknowledges the verified notification tap. | Verdict: SIMPLIFY
- Importers: main — `AlphaLocalAgentPlugin` (`ensure`, `forget`, `suspendForRestart`, `ownsSession`), `AlphaNotificationsPlugin` (`pending`, `acknowledge`), `MainActivity` (`captureTap`); generated resident host calls `resumeExisting` via `android/consumer-host.json:169` (`"ready": {"className":"AlphaCanonicalNotifications","method":"resumeExisting"}`). Text/path pins: `specs/quint/application/manifest.json`, `specs/quint/native/manifest.json:2105`, `specs/quint/refinement/application/canonical-notification-tap-admission.mjs`, `specs/quint/refinement/native/{CanonicalTapTraces.java,canonical-notification-tap.mjs,canonical-tap-platform.mjs,main-activity-platform.mjs,resident-platform.mjs}`, `test/alpha-system-entry.test.mjs`, `test/android-host.test.mjs`, `test/canonical-notification-security.test.mjs`, `test/credential-stop-dispatch.test.mjs`, `test/native-notification-diagnostics.test.mjs`, `test/native-plugin-teardown.test.mjs`, `test/power-cold-native-pin.test.mjs`, `test/resident-credential-shutdown-retry.test.mjs`, `test/resident-start-failure-policy.test.mjs`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16-24 | D3 (P2) | Process-wide mutable statics (`SERIAL`, `EVENTS`, `active`, `waitingTap`, `waitingTapAt`, `pendingTap`, `restoration`, `restoring`) guarded by `synchronized(AlphaCanonicalNotifications.class)` in 9 places. | Make it an application-scoped singleton instance (`NotificationTransport.get(context)`) holding the state as fields under one lock object; keep the static entry points as thin forwards until callers move. | Medium: Quint canonical-tap refinement compiles this file. |
| 2 | 38-39, 67-69 | C3 | "notifications allowed" check (`SDK>=33 && checkSelfPermission(POST_NOTIFICATIONS)!=GRANTED` + `areNotificationsEnabled()`) written twice. | `private static boolean notificationsAllowed(Context)`. | Low |
| 3 | 190, 198 | C3 | The pending-tap validity predicate (expiry, `subjectUserId`, `agentId`) is duplicated between `pending()` and `acknowledge()`. | `private static boolean tapCurrent(AlphaCanonicalNotifications a, JSONObject tap)`. | Low |
| 4 | 52, 53, 60, 84, 128, 186 | B1 | Six swallowed or comment-only catches: `catch(Exception ignored){}` (52, 84), `catch(Exception notReady){/* ... */}` (53), `catch(JSONException invalid){}` (60), malformed live event dropped (128), stale tap dropped (186). | Keep 53/128/186 (dropping is the specified behaviour; comments exist). Replace the empty 52/84/60 with `NativeNotificationDiagnostics.failure(stage, e)` or a `Log.w` of the class name. | Low |
| 5 | 89, 98, 103 | — | `new NativeOwnerReminderHost(context)` constructed three times per connect/check. | One final field. | None |
| 6 | 99 | C3 | Owner hash via `HostedResultNotices.hash(identity.toString())` — borrowing another feature's SHA helper. | Shared `Digests.sha256Hex` (cross-file). | Low |
| 7 | 60 | C3 (P9) | Inline `value.matches("[a-f0-9]{64}")`. | `Ids.isSha256Hex`. | None |
| 8 | 192 | C1 | `interface ForegroundCheck{void current()throws Exception;}` — one of ~8 "check() throws" guard interfaces (research §4). | One shared `Guard` functional interface. | Low |
| 9 | 32, 93, 117, 120 | NEW (race) | `private long attempt` is read on the `EVENTS` thread (117: `generation!=attempt`) and written on `SERIAL`; not volatile. Benign today (only drops events), but undocumented. | Make it `volatile` when touching the class. | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `ForegroundCheck` | interface | 192 | `NativeDigestSources.Guard`, `HostedInbox.Fence`, `HostedTransport.Guard`, `ResidentCredentialShutdownRetry.Guard`, `ResidentResultSession.Guard`, `SourceRenewalNotices.Guard` | shared `Guard` |
| `TAP_WINDOW_MS` | const | 19 | none | here |
| notifications-allowed check | helper (inline x2) | 38-39, 67-69 | `HostedDeliveryWorker`, `AlphaReminders` channel checks (similar) | here |

## Proposed end state
~190 lines: same transport algorithm, state owned by one instance with one lock, two duplicated predicates extracted, empty catches logged, constructor-held `NativeOwnerReminderHost`. Wire handling, tap window and retry backoff unchanged.

## Verification
`test/canonical-notification-security.test.mjs`, `test/native-notification-diagnostics.test.mjs`, `test/credential-stop-dispatch.test.mjs`, Quint canonical-notification-tap refinements, `NotificationsInstrumentedTest`, resident instrumentation (`ResidentServiceInstrumentedTest`).
