# android/app/src/main/java/ai/alphacompute/alphaphone/NativeNotificationDiagnostics.java
- Lines: 25 | Role: fixed-vocabulary logcat diagnostics for the canonical notification owner pipeline (stage + exception family, owner-route HTTP status) | Verdict: SIMPLIFY
- Importers: `AlphaCanonicalNotifications` (8), `AlphaLocalAgentPlugin` (9), `NativeOwnerReminderHost` (2). Text/path pins: `test/native-notification-diagnostics.test.mjs`, `test/notification-persist-owner-branches.test.mjs`, `test/native-notification-device-slot.test.mjs`, `test/native-deletion-review-fence.test.mjs`, `scripts/test-android-notification-device-slot.ts` (greps log lines), `specs/quint/refinement/native/{deletion-coordinator,resident-coordinator}.mjs`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7, 12 | C3 (P9) | Identical exception-family expression twice in one file: `failure instanceof SecurityException?"security":… JSONException?"json":… IOException?"io":"other"`; a third variant at `AlphaLocalAgentPlugin.java:30-35` (`ResidentAttachDiagnostic.failure`). | `private static String family(Throwable)`; later a package `Diagnostics.family` shared with `AlphaLocalAgentPlugin`. | None (log text unchanged). |
| 2 | 23 | C3 (P9) | HTTP status clamp `status>=100&&status<=599?status:0` duplicated at `AlphaLocalAgentPlugin.java:28`. | Shared `Diagnostics.httpStatus(int)`. | None. |
| 3 | 6-14 | C5 | `failure(Stage,…)` and `persistFailure(Persist,…)` differ only in the log key (`stage=` vs `persist=`). | One `log(String key, Enum stage, Exception)` with two thin entry points (keep names: 17 call sites + tests). | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `Stage`, `Persist` | enum | 5, 10 | — | here |
| exception family | helper | 7, 12 | `AlphaLocalAgentPlugin.java:30-35` | `Diagnostics.family` |
| status clamp | helper | 23 | `AlphaLocalAgentPlugin.java:28` | `Diagnostics.httpStatus` |

## Proposed end state
~18 lines; identical log strings (`stage=… family=…`, `persist=…`, `ownerRead=… status=…`).

## Verification
`test/native-notification-diagnostics.test.mjs`, `scripts/test-android-notification-device-slot.ts` log expectations.
