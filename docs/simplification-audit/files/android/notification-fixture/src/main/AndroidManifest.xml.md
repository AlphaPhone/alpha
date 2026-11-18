# android/notification-fixture/src/main/AndroidManifest.xml
- Lines: 9 | Role: manifest of the synthetic witness APK: POST_NOTIFICATIONS, `FixtureActivity` (launcher) and `MediaFixtureActivity` | Verdict: SIMPLIFY
- Importers: Gradle module. Text/path pins: `scripts/source-snapshot.ts:21` (directory), none on text. `NotificationAccessTestDriver.java:32` launches `ai.alphacompute.notificationfixture.FixtureActivity` by class name.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4 | A7 | `<activity android:name="ai.alphacompute.notificationfixture.MediaFixtureActivity" android:exported="true" …/>` declares the media witness whose only consumer is the manual `PhotosForeignLibraryInstrumentedTest` campaign; no script in the repo launches it (grep `MediaFixture`, `photosForeign` in scripts/.github: 0). | Delete line 4 together with `MediaFixtureActivity.java` and `src/main/assets/synthetic-blue.mp4` if the owner retires that campaign (see MediaFixtureActivity report). | Low |

## Local types and helpers
None.

## Proposed end state
8 lines: permission, application, `FixtureActivity` with launcher filter.

## Verification
`node scripts/build-notification-fixture.ts` (lint + badging check); cross-app notification campaign `scripts/test-cross-app-notifications.ts`.
