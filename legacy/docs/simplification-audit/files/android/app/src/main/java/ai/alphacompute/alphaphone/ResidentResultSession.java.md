# android/app/src/main/java/ai/alphacompute/alphaphone/ResidentResultSession.java
- Lines: 93 | Role: builds the bound channel for reading hosted workflow results from the on-device resident: verifies the saved machine session, adopts the per-boot root token, adds device-enrollment headers | Verdict: SIMPLIFY
- Importers: `HostedDelivery` (`open`), `AlphaLocalAgentPlugin` (`snapshot`), `NativeNotificationSession` (`snapshot`, `PLACEHOLDER_AGENT`). Text/path pins: `test/fixtures/ResidentResultTransportTest.java`, `test/fixtures/NativeNotificationSessionTest.java`, `test/resident-result-transport.test.mjs`, `test/native-notification-session.test.mjs`, `test/notification-persist-owner-branches.test.mjs`, `test/resident-android-json-compile.test.mjs`, `specs/quint/native/manifest.json`, `specs/quint/refinement/native/{hosted-inbox,resident-platform}.mjs`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 53-60 | C3 / C5 | Owner `/api/auth/me` check and single-running-agent check — copies shared with `NativeNotificationSession`, `NativeOwnerReminderHost`, `ResidentResultTransport`. | `ResidentOwner.requireOwnerSession` / `requireRunningAgent`. | Medium (security; keep messages). |
| 2 | 17, 46 | C3 | Token shape check twice in this file (and 7 elsewhere). | `Ids.bearer(token, 8192)`. | None. |
| 3 | 31-37 | D9 | `HostedResultNotices.hash(raw)` computed up to 4× per `credential()` call; adoption race handling packed into one condition. | `String rawDigest=hash(raw)` once; split the "already adopted by a sibling transport" branch into a named method. | Low. |
| 4 | 76-78 | C3 | `[a-f0-9]{64}` / `[a-f0-9-]{36}` inline id checks. | `Ids.*`. | None. |
| 5 | 14 | C1 | `interface Guard {void check()}` — 7 twins. | Shared `Guard`. | Low. |
| 6 | 84 | C6 | `"calendar.local-event.v1,notes.local-record.v1"` device capability header literal; also at `HostedTransport.java:27` and checked in `AlphaLocalAgentPlugin.java:1144,1292`. | One constant. | None. |
| 7 | 21 | A3 (P15) | `open` takes `HostedInbox.Store` — fine; this is the `resident` mode that P15 keeps. | Keep. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `Runtime` | interface | 7-12 | — | here |
| `Guard` | interface | 14 | 7 copies | shared `Guard` |
| `PLACEHOLDER_AGENT` | const | 13 | used by `NativeNotificationSession:68` | `ResidentOwner` |
| `BoundChannel` | local class | 26-89 | `HostedTransport` (remote/cloud channel, same shape) | here |
| `snapshot` | helper | 15-20 | — | here |

## Proposed end state
~75 lines: `snapshot`, `open` with `BoundChannel` using shared owner/agent/id/token helpers; persisted session format
(`version:1`, `runtimeDigest`) unchanged.

## Verification
`test/resident-result-transport.test.mjs`, `test/native-notification-session.test.mjs`, Quint hosted-inbox refinement,
hosted results instrumentation with a resident restart.
