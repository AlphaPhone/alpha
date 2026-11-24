# android/app/src/main/java/ai/alphacompute/alphaphone/ResidentResultTransport.java
- Lines: 67 | Role: `HostedInbox.DeliveryTransport` for the resident: 60 s budget, owner/agent re-verification and a two-route allowlist (results read + ack) | Verdict: SIMPLIFY
- Importers: `ResidentResultSession` (constructs it). Text/path pins: `test/fixtures/ResidentResultTransportTest.java` + `test/resident-result-transport.test.mjs` (javac), `test/native-notification-session.test.mjs`, `test/resident-android-json-compile.test.mjs`, `specs/quint/native/manifest.json`, `specs/quint/refinement/native/hosted-inbox.mjs`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 45-52 | C3 / C5 | 5th copy of the owner-session check (uses `getDouble("expiresAt")<=now` instead of equality with the saved expiry) and a 3rd variant of the running-agent check (no placeholder check). | `ResidentOwner.*`; decide one rule for `expiresAt` (equality with the bound session is stricter — `ResidentResultSession` already enforces it on adoption). | Medium. |
| 2 | 38-39 | C5 | 401/403 → SecurityException, non-2xx → IOException; same mapping in `ResidentResultSession.identity:68-69` and `HostedTransport`. | One `requireOk(response)` helper. | None. |
| 3 | 63 | C3 | Safe-integer cursor check (twin of `NativeNotificationSession.sequence`, `HostedInbox:17`, `SmsActionJournalResult:22`). | `Json.safeInteger`. | None. |
| 4 | 61 | C3 | Exact-key check by `length()!=3` + `has`. | `Json.requireExactKeys`. | None. |
| 5 | 21-24 | D7 | Second constructor with an injectable clock, used only by `ResidentResultTransportTest`. | Keep one constructor that takes the clock; `ResidentResultSession` passes `System::nanoTime`. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `Channel` | interface | 11-15 | `HostedInbox.DeliveryTransport` (similar exchange/check) | here |
| `call(path, body)` | helper | 34-43 | `HostedTransport` request helper | here |

## Proposed end state
~55 lines; route allowlist and size bound (1,100,000 bytes) unchanged.

## Verification
`test/resident-result-transport.test.mjs`, Quint hosted-inbox refinement, hosted results instrumentation.
