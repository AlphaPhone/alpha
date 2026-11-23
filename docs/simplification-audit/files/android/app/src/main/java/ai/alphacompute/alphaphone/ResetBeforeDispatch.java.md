# android/app/src/main/java/ai/alphacompute/alphaphone/ResetBeforeDispatch.java
- Lines: 77 | Role: work before a confirmed data reset clears the package: delete Alpha's local calendar, revoke this phone's Cloud key, and revoke a retained pre-namespace production key | Verdict: SIMPLIFY
- Importers: `AlphaDataReset` (`STEP`). Text/path pins: `test/reset-cloud-revocation.test.mjs` (javac; injects transport via `create`), `test/reset-wiring.test.mjs`, `test/reset-startup.test.mjs`, `test/connection-routes.test.mjs`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 32, 37, 42-58 | A1 (P5) | Legacy step `readLegacyCloudSlot` + `distinctCredential` revoke "a retained pre-namespace production key" (`AlphaCredentialStore.readLegacySlotBeforeAttach`). No such key exists under the renamed package. | Delete lines 32, 37, 42-58 and the Javadoc mentions (16-17, 27); delete `AlphaCredentialStore.readLegacySlotBeforeAttach`. Do it with `LegacyCloudRecovery`. | Medium: owner decision P5 (same as LegacyCloudRecovery). |
| 2 | 70 | B1 | `catch(Exception unavailable){/* The local reset must still proceed. */}` — specified best-effort. | Keep. | — |
| 3 | 28 | D7 | "The transport is injectable for host tests." — `create(Transport)` exists for `reset-cloud-revocation.test.mjs`. | Keep while that test stays; otherwise inline `STEP`. | Low. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `remaining(deadline)` | helper | 40 | deadline math in `ResidentResultTransport`, `NativeOwnerReminderHost` | here |
| `deleteLocalCalendar` | helper | 62-75 | Calendar account constants in `AlphaCalendarPlugin.CONFIGURATION` | here |
| `distinctCredential` | helper | 49-58 | — | deleted |

## Proposed end state
~45 lines: calendar delete + one Cloud revocation step within the budget.

## Verification
`test/reset-cloud-revocation.test.mjs` (drop legacy cases), `test/reset-wiring.test.mjs`, `ResetPolicyInstrumentedTest`, device reset acceptance.
