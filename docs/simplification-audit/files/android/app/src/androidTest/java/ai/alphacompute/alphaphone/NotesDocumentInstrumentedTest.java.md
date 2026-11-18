# android/app/src/androidTest/java/ai/alphacompute/alphaphone/NotesDocumentInstrumentedTest.java
- Lines: 185 | Role: on flag-off builds, Notes import/export is refused with no picker launched; on test-mocks builds, a full SAF picker import/export/cancel/recreation flow, oversize/invalid-UTF-8 refusal, and a process-restart phase. | Verdict: SIMPLIFY (most of it is a developer surface for a PRD-excluded feature)
- Importers: none (instantiates `SelectedDocumentInstrumentedTest` for picker steps). Text/path pins: `scripts/android-instrumentation.ts:189`; `scripts/test-native-restart.ts:56` (`testClass: "NotesDocumentInstrumentedTest"`, `notesDocumentPhase`/`notesDocumentRunId`); `test/fixtures/isolated-native-campaign.mjs`. Production hooks: `SelectedDocumentAccess.selections()` (`SelectedDocumentAccess.java:40`, only caller is this test), `restore`, `forget`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 114-153, 154-164, 165-183 | A3 | `runFlow`, `oversizedAndInvalidUtf8DoNotCreateNotes` (test-mocks half) and `documentProcessRestartPhase` exercise Notes text import, which product builds refuse (`AlphaNoteDocumentsPlugin.java:26` returns `unsupported` unless `ELIZA_DEV_ALLOW_TEST_MOCKS`; renderer `canImportText:false` in `apps/app/src/prototype/canonical-notes-ui.ts:299`). PRD AP-12: "no backup/import/export"; DECISIONS D3. | Delete the test-mocks import flow, the restart phase and the `notes-document` case in `scripts/test-native-restart.ts:56`; delete the gated `importText` branch and the template's "Import text note" control (`apps/app/src/prototype/template.html:2460`) in the same change (owner confirms). | Medium (cross-file; owner) |
| 2 | 98-113 | B? (verify) | `productRefusal()` expects `["unsupported","unsupported"]` for `importText()` **and** `exportText({text})`, but `exportText` is not test-mocks gated (`AlphaNoteDocumentsPlugin.java:27-31`: returns `unavailable` when not foreground, otherwise opens a create-document picker). The expectation looks stale unless something else intercepts — needs an emulator run to confirm. | Run `--classes NotesDocument` on a flag-off build; fix the expectation to the real export behaviour (export of a note via the Share panel "Save locally" is product). | Medium |
| 3 | 79-82 | D7 | `selections()` wraps `SelectedDocumentAccess.selections()`, a main-source method whose only caller is this test (grep: 1 main hit = the declaration). | Delete with finding 1; then delete `SelectedDocumentAccess.selections()` (P12). | Low |
| 4 | 15, 29, 30 | C3 | `until/click/title` copies; `until` failure diagnostics 600 chars. | Shared driver. | Low |
| 5 | 42-55, 77 | C3 | `dumpsys` resumed-activity parser and accessibility BFS for "Save" — copies of `WebViewTestDriver.cancelDocumentPicker` and `MapsRegionalInstrumentedTest.permissionButton`. | Shared helpers (or gone with finding 1). | Low |
| 6 | 104-105 | C3 | Outgoing-activity `ActivityMonitor` counter, same as `ImageCapabilitiesInstrumentedTest:24-26`. | Shared helper. | None |
| 7 | 98, 155 | B4 | `@Test` methods branch on `BuildConfig.ELIZA_DEV_ALLOW_TEST_MOCKS` and both call `productRefusal()` on flag-off — the refusal runs twice per default run. | One `productRefusal` test with `assumeFalse(test mocks)`. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `observeReceipt/awaitReceipt` | helper | 22-28 | cancel-notice observer L65 (same file) | `Ui.observeToast(text)` |
| `surfaceCategory/awaitDocumentPicker` | helper | 32-55 | `WebViewTestDriver.cancelDocumentPicker`, `LauncherHomeInstrumentedTest.foreground` | shared `resumedPackage()` |
| `nativeSave` | helper | 76-78 | `MapsRegionalInstrumentedTest.permissionButton` | `AccessibilityClick` |
| `selectExport/verifyExport` | helper | 83-97 | `SelectedDocumentInstrumentedTest` | delete with finding 1 |

## Proposed end state
A single flag-off test: Notes offers no import control, `importText` returns `unsupported`, no activity launched, Notes unchanged (and, if product, one check that Share -> Save locally exports exact bytes). About 30 lines. Everything test-mocks-only goes with the import feature.

## Verification
`npm run test:android:instrumentation -- --classes NotesDocument` on both flag-off variants (confirm finding 2 first); `node --test test/android-instrumentation-runner.test.mjs`; drop the `notes-document` case from `scripts/test-native-restart.ts` and its fixture in `test/fixtures/isolated-native-campaign.mjs`.
