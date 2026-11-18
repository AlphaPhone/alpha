# android/app/src/androidTest/java/ai/alphacompute/alphaphone/NotesSecureStorageInstrumentedTest.java
- Lines: 132 | Role: real-renderer Notes edits persisted to the Keystore-encrypted `notes-records:v1:device` slot, plus two legacy-localStorage-layout migration tests | Verdict: SIMPLIFY (delete the two migration tests; owner decision A1 for the restart one)
- Importers: none (JUnit class). Uses `WebViewTestDriver`, `NotesSecureFixture`, `AppNavigation`, `BoundedActivityScenario`.
  Text/path pins: `scripts/android-instrumentation.ts:250` registry `NotesSecureStorage: { args: { notesSecureStorage: "1" } }` (the runner test `test/android-instrumentation-runner.test.mjs:143-160` text-matches `"1".equals(InstrumentationRegistry.getArguments().getString("notesSecureStorage")` in this file, line 28);
  `scripts/test-native-restart.ts:72-80` campaign `notes-secure-migration` (testClass + method `secureMigrationProcessRestartPhase` + gate `notesSecureMigrationPhase`);
  `test/android-instrumentation-runner.test.mjs:611` (asserts the file contains `getString("notesSecureMigrationPhase")` and the literals `"prepare"`, `"verify"`, `"cleanup"`), `:215` (registry key exists);
  `test/native-restart-runner.test.mjs:10,45`; `test/fixtures/isolated-native-campaign.mjs:12,18`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 47-75 | A7 / T9 | `freshInstallLegacyMigrationRetainsExactArchiveAndAudio` is gated on `getString("notesSecureMigration")` (l.48). Whole-repo grep for `notesSecureMigration"`/`notesSecureMigration:`: 0 hits outside this file; the registry passes only `notesSecureStorage`. The method is always assumption-skipped and is a single-process duplicate of the restart campaign below. | Delete lines 47-75. | None: never runs. |
| 2 | 77-131 | A1 | `secureMigrationProcessRestartPhase` seeds `localStorage['alphaphone:prototype:notes:v1']` / `['alphaphone:notes:v2']` and proves migration into the encrypted slot with `archive.v1/v2`. These are the legacy keys `LEGACY_NOTES_KEY`/`NOTES_KEY` in `apps/app/src/runtime/notes-store.ts:3-4`. PRD: new package, no app-data migration. | With the A1 owner decision: delete lines 77-131 together with the renderer migration reader, the `notes-secure-migration` entry in `scripts/test-native-restart.ts:72-80`, `test/android-instrumentation-runner.test.mjs:611` row, `test/native-restart-runner.test.mjs:10,45`, `test/fixtures/isolated-native-campaign.mjs` keys. | Medium: removes the only device evidence of the migration path (intended). |
| 3 | 33 | A1 | `assertEquals("true",js("localStorage.getItem('alphaphone:notes:v2')===null&&localStorage.getItem('alphaphone:prototype:notes:v1')===null"))` asserts legacy keys stay absent. | Delete with #2. | Low. |
| 4 | 15-17, 25 | C3 / P20 | Private `js`, `until`, `click(label)`, `input(selector,value,multiline)` (native setter + input/change events). Same four helpers exist in `NotesStorageDurabilityInstrumentedTest.java:71-76`, `PhotoEditInstrumentedTest.java:17-19`, `PasswordVaultSettingsInstrumentedTest.java:31-48`, `PairedMapsInstrumentedTest.java:21-22,40-44` and ~60 other androidTest files. | Use one `WebViewTestDriver.until/click/setValue` (add them there). | Low; failure messages change. |
| 5 | 26 | C3 | `sha(String)` SHA-256 hex; twins: `PairedMapsInstrumentedTest.java:27`, `PairedReminderInstrumentedTest.java:27`, `PasswordFillFixtureActivity.java:23-29`, `PhotoFilterInstrumentedTest.java:32` (inline), `PhotosTestFixture.java:31` (+~26 more androidTest files use `MessageDigest.getInstance("SHA-256")`). | One `TestDigests.sha256Hex(String|byte[])` in androidTest. | None. |
| 6 | 18-19 | C3 | `saved()` = await `secureRead` via a window global; duplicates `NotesSecureFixture.read()` (same slot, same bridge call). | Replace `saved()`/`envelope()` with `NotesSecureFixture.read()`/`raw()`. | None. |
| 7 | 59, 67-69, 102, 125-127 | C3 | The secure CAS JSON (`slot`,`expectedValue`,`value` → `secureCompareExchange`) is written out four times here and again as `cas()` in `NotesStorageDurabilityInstrumentedTest.java:78-81`. | Add `NotesSecureFixture.compareExchange(slot,expected,value)`. Disappears with #1/#2 here. | None. |
| 8 | 32, 38, 40, 43 | C3 | `AppNavigation.liveMode();js(AppNavigation.request("Notes"));until("window.__alphaTestNavigation?.status==='complete'");committed();` repeated 4 times (6 with #1/#2). | Private `openNotes()` (as Durability l.76 already has). | None. |
| 9 | 16, 21-25 | D8 | Multi-statement one-line methods. | Formatter pass (google-java-format). | Breaks the runner test only if it changes the exact gate text on l.28 (keep that expression on one line). |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `js` | helper | 15 | 62 androidTest files (`String js(` / `String eval(`) incl. NotesStorageDurability:71, PhotoEdit:17, PhotosBatch:24, PhotoLibrary:26, PhotosForeignLibrary:18 | delete; call `WebViewTestDriver.evaluate` |
| `until` | helper | 16 | NotesStorageDurability:72, PhotoEdit:18, PhotosBatch:25, PhotoLibrary:27, Notifications:25, NotificationChannels:15, PasswordVaultSettings:32, PairedAsrLive:21, PairedVoiceLive:21, PairedMaps:21, PairedReminder:21, PasswordBrowserFill:45 | `WebViewTestDriver.until(expr, timeoutMs, message)` |
| `click(label)` | helper | 17 | NotesStorageDurability:74, PhotoEdit:19, PhotosBatch:26, NotificationChannels:16, PairedAsrLive:22, PairedVoiceLive:22, PairedMaps:22, PairedReminder:22, PasswordVaultSettings:41, PasswordBrowserFill:46 | `WebViewTestDriver.click(name)` |
| `input` | helper | 25 | NotesStorageDurability:75, PairedMaps:40-44, PasswordVaultSettings:45-48, PasswordBrowserFill:50-56 | `WebViewTestDriver.setValue(selector, value)` |
| `sha` | helper | 26 | see finding 5 | `TestDigests.sha256Hex` |
| `saved`/`envelope` | helper | 18-19 | `NotesSecureFixture.read/raw` | delete |
| `stored` | helper | 20 | `NotesSecureFixture.evaluate` polling | keep (Notes-specific) |

## Proposed end state
Only `actualEditorEncryptedCommitAndRecreation` remains (lines 27-46), using `NotesSecureFixture.read()` and shared
`WebViewTestDriver` helpers; `committed()` stays as the Notes-specific readiness check with its diagnostic. Both migration
methods, the legacy-key assertions and the restart-campaign plumbing are deleted (method 1 immediately — it never runs;
method 2 with the A1 decision). Estimated 132 → ~45 lines (≈105 if the restart migration is kept).

## Verification
`npm run test:android:instrumentation -- --owned-emulator --classes NotesSecureStorage` (passes `notesSecureStorage=1`);
host: `node --test test/android-instrumentation-runner.test.mjs test/native-restart-runner.test.mjs`. If #2 is kept,
`node scripts/test-native-restart.ts notes-secure-migration`. Browser coverage of the renderer side:
`test/browser/notes-*.spec.ts`.
