# test/alpha-system-entry.test.mjs
- Lines: 131 | Kind: unit on host JVM (compiles `AlphaQuickSettingsTile.java` and vendor `AssistantEntryTile.java` against hand-written Android stubs, inline Java harness), compile check against `android.jar`, source-text over `AndroidManifest.xml`, and a run of the vendor `rewriteResidentClass` over vendor `ElizaAgentService.java` | Verdict: DELETE; move two release rules into `scripts/verify-apks.ts`
- Covers: the Quick Settings tile waits for unlock and launches the assist activity with an immutable explicit intent; the tile service is permission-protected and non-toggleable; resident notifications use Alpha strings, never upstream product text. Duplicates: `test/android-host.test.mjs:144-166` (same rewrite and notification strings); Gradle compiles the tile in every Android build. Callers/importers: `npm test` glob; imports `vendor/eliza/.../resident-host-sources.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 18-69 | T3 | 60 lines of fake Android framework classes so a 20-line tile can run on the host JVM; the fakes define the behaviour being asserted. | Delete. | Low |
| 2 | 71-81 | T4 | Compile check duplicated by `android:build`; skipped locally when API 36 is absent. | Delete. | None |
| 3 | 83-95 | T1 | Manifest regexes. The permission/non-toggleable rule is a real release rule. | Move to `verify-apks.ts` (read the merged manifest from the APK). | Low |
| 4 | 97-131 | T5, T4 | Runs upstream's rewrite on upstream source and pins upstream text; duplicated in `android-host.test.mjs`. "No upstream product text in notifications" is a real release rule. | Move to `verify-apks.ts` / `audit-production-bundle.ts` as a string check on the built APK. | Low |
| 5 | 51-61 | A1 | Tests an `openLegacy` path for older Android; review whether minSdk 29 still needs it (owner/android chunk). | - | - |

## Proposed end state
File deleted. `verify-apks.ts` gains two checks on built output: the tile service requires `BIND_QUICK_SETTINGS_TILE` and is
not toggleable; no `Eliza agent` strings in the packaged resources. Tile behaviour on a device is an emulator
instrumentation concern (`AlphaQuickSettingsTile` under P-78 stays disabled while its target is disabled).
