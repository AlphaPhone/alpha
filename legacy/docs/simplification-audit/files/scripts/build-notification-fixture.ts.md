# scripts/build-notification-fixture.ts
- Lines: 28 | Kind: manual test-fixture builder (two synthetic notification-poster APKs for cross-app notification instrumentation) | Verdict: DELETE with the unwired campaign (or MOVE to `test/` if the campaign is wired into CI)
- Covers: builds `ai.alphacompute.notificationfixture.{selected,excluded}` APKs signed with a throwaway key, no INTERNET permission, for `NotificationsInstrumentedTest` / `NotificationAccessTestDriver`. Callers/importers: **no npm script or workflow runs it** (`git grep build-notification-fixture`: only `scripts/gradle-verification.ts:57` (input path list) and `:284` (comment), `test/gradle-verification.test.mjs:41,160` (reads this file's text for Gradle task names, T1)). The APKs are consumed by `scripts/test-cross-app-notifications.ts`, which is itself listed only in `android-instrumentation.ts:311 CAMPAIGN_RUNNERS` and run by no workflow (research 2.2). The Gradle module `android/notification-fixture` and its tasks stay referenced by `gradle-verification.ts` `VERIFIED_TASKS` for dependency metadata.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | A7, T9 | Fixture builder for a campaign no CI lane runs. | Owner decision per research 2.2: wire `test-cross-app-notifications` into `android-emulator.yml` (then move this builder under `test/android/` and call it from that lane) or delete the builder, the campaign runner, its `CAMPAIGN_RUNNERS` entry, and the `notification-fixture` Gradle module + its `VERIFIED_TASKS` entries. | Medium: cross-app notification listening (AP notifications) loses its only device-level coverage if deleted. |
| 2 | 17 | C3 | Hard-coded `build-tools/36.0.0` paths for aapt/apksigner; `toolchain.ts tool()` exists. | Use `tool('aapt')`, `tool('apksigner')`. | None. |
| 3 | 11 | - | Synthetic keystore password literal `synthetic-fixture`: a test value, fine. | - | - |

## Proposed end state
Either gone together with the campaign, or `test/android/build-notification-fixture.ts` invoked by the emulator lane that
runs the cross-app notification instrumentation. In both cases `gradle-verification.test.mjs` stops reading its text.
