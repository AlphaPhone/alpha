# android/app/src/androidTest/java/ai/alphacompute/alphaphone/WorkflowLegacyReminderUpgradeInstrumentedTest.java
- Lines: 53 | Role: Installed-upgrade companion: after an old APK seeded a pre-revision one-off reminder (`upgrade_legacy`), the new APK's reminder engine reports it as `legacyAlarm` and `NativeDigestSources` includes it in morning/evening digests. | Verdict: DELETE (owner decision, with the A1 upgrade suite)
- Importers: none. Run by `scripts/test-installed-upgrade.ts:38,117` (`companion('legacy-digest', ..., WorkflowLegacyReminderUpgradeInstrumentedTest, 'upgradedLegacyOneOffReminderIsIncludedInNativeDigest')`). Text/path pins: `scripts/test-installed-upgrade.ts:38,117`, `test/installed-upgrade-runner.test.mjs:77` (`legacyClass`, `legacySelector`), registry `scripts/android-instrumentation.ts` `WorkflowLegacyReminderUpgrade` campaign string.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13-52 | A1 | Tests a legacy reader path for data that cannot exist on this package: "after the old APK seeded a pre-revision one-off reminder ... the new APK replaced it without clearing data". The package was renamed on 2026-11-10 and starts with empty private data (PATTERNS A1); research android.md §3 lists `WorkflowLegacyReminderUpgrade` among upgrade instrumentation to delete. Note: the `legacyAlarm` flag is produced upstream (`plugin-native-reminders` `ReminderStore.java`), and `NativeDigestSources.java:79` has no special branch for it, only a comment. | Delete the file, the `legacy-digest` companion call and receipt key in `scripts/test-installed-upgrade.ts` (lines ~38, 117), the `legacyClass` assertions in `test/installed-upgrade-runner.test.mjs:77`, and the registry entry. Keep a generic "update keeps data" upgrade test as research recommends. | Medium: removes the only installed-upgrade digest check; owner must confirm no install base of the old package. |
| 2 | 34 | C4 | In-memory `NativeDigestSources.Storage` anonymous adapter over a `HashMap`, duplicated in `WorkflowPhoneNativeInstrumentedTest:81`. | If kept: one `MapStorage` test class. | None. |
| 3 | 26 | C6 | `"ai.alphacompute.alphaphone"` literal. | `BuildConfig.APPLICATION_ID`. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| anonymous `NativeDigestSources.Storage` (HashMap) | class | 34 | `WorkflowPhoneNativeInstrumentedTest:81` | delete here; `MapStorage` in androidTest if the other survives |
| anonymous `NativeDigestSources.Reader` | class | 38-41 | `WorkflowPhoneNativeInstrumentedTest:87-91` | delete here |

## Proposed end state
File deleted (0 lines); `scripts/test-installed-upgrade.ts` reminder upgrade loses its legacy-digest companion; the morning/evening digest behaviour remains covered by `WorkflowPhoneNativeInstrumentedTest#morningAndEveningShareOneCalendarSourceWithDistinctWindows`.

## Verification
`node --test test/installed-upgrade-runner.test.mjs test/android-instrumentation-runner.test.mjs`; `node scripts/test-installed-upgrade.ts reminder` if the upgrade campaign is kept at all.
