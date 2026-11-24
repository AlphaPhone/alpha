# android/app/src/main/java/ai/alphacompute/alphaphone/NativeNotificationSession.java
- Lines: 75 | Role: restores the canonical-notification owner session after a resident restart (verifies `/api/auth/me` and `/api/agents`), builds the paged notification route and the persisted owner record | Verdict: SIMPLIFY
- Importers: `AlphaLocalAgentPlugin` (9), `AlphaCanonicalNotifications` (4). Text/path pins: `test/fixtures/NativeNotificationSessionTest.java` + `test/native-notification-session.test.mjs` (javac), `test/notification-persist-owner-branches.test.mjs`, `specs/quint/refinement/native/resident-coordinator.mjs`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 60-63 | C3 / C5 | Owner-session verification of `/api/auth/me` (`identity.id==owner && kind=="owner" && access.role=="OWNER" && access.mode=="session" && session.kind=="machine" && session.id==token && expiresAt==expiry`) is copy-pasted in 4 files: here, `NativeOwnerReminderHost.java:70-74`, `ResidentResultSession.java:53-55`, `ResidentResultTransport.java:45-49` (and a partial one at `AlphaLocalAgentPlugin.java:1186`). | One `ResidentOwner.requireOwnerSession(JSONObject me, String owner, String token, long expiry, String message)`; keep each caller's exception message by parameter. | Medium: security-critical; Quint traces assert the messages. |
| 2 | 64-69 | C3 / C5 | "exactly one agent, running, not the placeholder, equal to expected" check repeated in `ResidentResultSession.java:56-60`, `ResidentResultTransport.java:50-52`, `NativeOwnerReminderHost.java:78-80` (each with a different subset). | `ResidentOwner.requireRunningAgent(JSONArray agents, String expected)` returning the id; callers keep their exception types (IOException "not ready" vs SecurityException "changed"). | Medium (the subsets differ intentionally? — the placeholder check is missing in two copies; confirm and use the strict form). |
| 3 | 24, 51 | C3 (P9) | Two different UUID regexes in one file (`[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}` lowercase vs `[0-9a-fA-F]…`), plus 4 more across main. | `Ids.uuid(String, boolean lowerOnly)`. | None if case rules are kept. |
| 4 | 34-40 | C3 | `sequence()` safe-integer check (`Number`, finite, integral, `0..2^53-1`) duplicates `ResidentResultTransport.java:63`, `HostedInbox.java:17`, `SmsActionJournalResult.java:22`. | `Json.safeInteger(Object, min)`. | None. |
| 5 | 54 | C3 | Token shape check (8192 limit) — 9 copies. | `Ids.bearer`. | None. |
| 6 | 19 | C3 | Exact-key validation by iterating keys against `Set.of(...)` — twin of `NativeDigestSources.keys`. | `Json.requireExactKeys` (here: subset form). | None. |
| 7 | 55-58 | — | Local class `Current` used as a closure for a re-check. | Fine; keep or turn into a private method taking the captured values. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `Ports` | interface | 9-16 | `NativeOwnerReminderHost.Ports` (different members, same idea) | here |
| `Superseded` | exception | 7 | `AlphaLocalAgentPlugin.Superseded` (separate class of same name) | here |
| `SLOT` | const (persisted) | 8 | `RendererCredentialSlots` lists `canonical-notification-owner` | `Slots` |
| owner-session check | helper (inline) | 60-63 | 4 copies (finding 1) | new `ResidentOwner` |
| running-agent check | helper (inline) | 64-69 | 3 copies | `ResidentOwner` |
| `sequence` | helper | 34-40 | 3 copies | `Json.safeInteger` |

## Proposed end state
~55 lines: `pagePath`, `record`, `restore` delegating owner/agent verification to `ResidentOwner`; shared id/token helpers.
Record format (`version:1`, `projectionOwner`) unchanged.

## Verification
`test/native-notification-session.test.mjs`, `test/notification-persist-owner-branches.test.mjs`, Quint `resident-coordinator.mjs`,
canonical notification instrumentation (`CanonicalNotification*InstrumentedTest`).
