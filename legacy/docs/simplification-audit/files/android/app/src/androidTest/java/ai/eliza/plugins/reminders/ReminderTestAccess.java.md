# android/app/src/androidTest/java/ai/eliza/plugins/reminders/ReminderTestAccess.java
- Lines: 105 | Role: split-package instrumentation accessor that forwards to the upstream reminder engine (`ReminderStore`, `ReminderEnvelope`, `ReminderTaps`) for Alpha's reminder instrumentation suites, plus an in-memory `SecureStringStore` and fixture configuration. | Verdict: SIMPLIFY (absorb `ReminderLifecycleTestAccess`, de-duplicate fixture config)
- Importers: 22 androidTest classes (heaviest: `.read` 123 uses, `.schedule` 36, `.operate` 33, `.Envelope` 24). Every public member has at least one user (grep of `ReminderTestAccess\.<member>` across androidTest). Text/path pins: none in `test/`, `specs/`, `scripts/`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-105 | T5 / T3 | Exists to expose upstream package-private engine state (`delegate.value`, `envelope.begin/active/commit/abort`, `ReminderTaps.capture`). Most of the 16 `Reminder*InstrumentedTest` classes using it check engine behaviour that upstream owns. | Owner decision: keep only Alpha journeys (notification tap opens Alpha, reminder survives restart) and move engine-level suites upstream; then this file shrinks to the handful of members those journeys need. | Medium: large androidTest churn. |
| 2 | 34-37 | C3 | `fixtureConfiguration()` (20-arg `ReminderConfiguration`) duplicates `ReminderDeletionJournalFixture.config(id)` (19-arg). | One `fixtureConfiguration(String id)`; take `Receiver` in from the fixture file. | Low |
| 3 | 59-73 | D4 | 15 static one-line forwards `store(c).x(c,...)` incl. three `schedule` overloads. | Acceptable test seam; after #1 delete unused overloads. | None |
| 4 | 91-104 | D4 | `Taps` wraps `ReminderTaps` and re-maps `ReminderTaps.UnknownTap` to its own `UnknownTap` (:95, :100). | Expose `ReminderTaps.UnknownTap` directly (same package) and drop the re-map. | Low |
| 5 | 55-57, 92-94 | C6 | Re-exports `AlphaReminders.CONFIGURATION.*` as `CHANNEL`, `OPEN_ID`, `OCCURRENCE`, `Taps.SLOT/ACTION/PREFIX`. | Tests can read `AlphaReminders.CONFIGURATION` directly; keep only if it shortens many call sites. | Low |
| 6 | 83-90 | B1 | `catch(RuntimeException|JSONException failure){envelope.abort();throw failure;}` — fine (rethrows). | Keep. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `Recording` | class (SecureStringStore) | 39-45 | in-memory slot stores in `specs/quint/refinement/native/*-platform.mjs` stubs and `test/fixtures/*` (memory `HashMap` slot stores) | keep here (androidTest) |
| `fixtureConfiguration()` | helper | 34-37 | `ReminderDeletionJournalFixture.config` (:15) | here |
| `store(Context)` | helper | 51-54 | `ReminderLifecycleTestAccess.store` (:11) | here |
| `alarm(...)` | helper | 47-50 | none | here |
| `Envelope`, `Taps` | classes | 74-104 | none | here |

## Proposed end state
Single reminder accessor (~110 lines after absorbing `ReminderLifecycleTestAccess` and the fixture `Receiver`, minus the `UnknownTap` re-map and duplicated config). If the owner moves engine-level suites upstream, it shrinks to ~30 lines (`read`, `schedule`, `deliver`, `Taps`).

## Verification
All 16 `Reminder*InstrumentedTest`, `ClockAgentReviewInstrumentedTest`, `DailyAppsInstrumentedTest`, `NotificationsInstrumentedTest`, `ReminderUiTestDriver`. Re-run the Android build (androidTest compile) and the reminder instrumentation runners in `scripts/android-instrumentation.ts`.
