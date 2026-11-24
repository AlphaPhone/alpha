# android/app/src/androidTest/java/ai/alphacompute/alphaphone/SelectedDocumentInstrumentedTest.java
- Lines: 350 (36 KB) | Role: real MediaStore fixtures picked through real DocumentsUI into Files: preview switching, share, Ask Alpha, grant persistence/forget, rename, PDF pages, process-restart phases, and J03 source references (`AlphaMailAttachments.retainSourceReference/openSourceReference`). Also serves as the DocumentsUI picker library for other classes. | Verdict: SPLIT (picker + fixtures to `DocumentsUiPicker.java`) and SIMPLIFY
- Importers: instantiated as a helper by 4 other test classes — `BrowserFlowInstrumentedTest:144` (`fixture`), `CameraScanInstrumentedTest:144,179,223,229` (`fixtureBytes`, `selectDocument`), `NotesDocumentInstrumentedTest:86,117` (`selectDocument`, `fixture`), `PosterCalendarJourneyInstrumentedTest:54` (field; never-run class). Registry `SelectedDocument` (`scripts/android-instrumentation.ts:206`). Campaigns: `scripts/test-native-restart.ts:65,112` (`documentProcessRestartPhase`, `sourceReferenceProcessRestartPhase`). Text/path pins: `test/android-instrumentation-runner.test.mjs:614` (class + method + arg `sourceReferencePhase` + phases), `test/fixtures/isolated-native-campaign.mjs:18` (class name).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 49-131 | NEW (test class used as helper library) / D11 | `new SelectedDocumentInstrumentedTest().selectDocument(name)` and `.fixture(...)` are how 4 other classes drive DocumentsUI — instantiating a JUnit class to borrow helpers. | Move `fixture`, `fixtureBytes`, `providerName`, `find`, `press`, `textEquals`, `hasAncestorId`, `pickerDiagnostics`, `selectDocument` (≈85 lines) to package-private `DocumentsUiPicker` (static); update the 4 callers. | Low (mechanical; same code). |
| 2 | 33-43 | D4 / B4 | `eval(scenario,script)` and `waitFor(scenario,cond)` take a `scenario` they never use (`return WebViewTestDriver.evaluate(script);`). | Delete the parameter (≈60 call sites in this file) and use `WebViewTestDriver.evaluate` / shared `until`. | None. |
| 3 | 44-48 | C3 | `click(label)` by `aria-label` — same helper in SettingsFlow `click`, SettingsNative `label`, SettingsRoles/SettingsCrashLog `button`, each with a different match rule. | `WebViewTestDriver.clickButton(name)` with the accessible-name rule (`aria-label` else trimmed text) from `SettingsFlowInstrumentedTest.press:91-94`. | Low: some callers match by `startsWith` — keep that variant explicit. |
| 4 | 266 | C3 | `sha256(byte[])` hex — one of ~30 androidTest copies. | Shared digest helper (see ResidentTestFixture report). | None. |
| 5 | 267-271 | C3 | `plugin()` promise→window-key→poll helper; same as `ScopedVoicePlayback.call` and ~28 others. | `WebViewTestDriver.awaitPromise`. | None. |
| 6 | 243-245 vs 329-331, 246-252 vs 332-341 | C3 | `cleanup`/`prepare` blocks of the two restart phases are near-identical (SharedPreferences fixture, forget selection, delete URI). | One `RestartFixture(prefsName)` with `prepare/verify/cleanup` helpers. | Low; phase arg names `documentPhase` / `sourceReferencePhase` and prefs names must stay (runner test pins them). |
| 7 | 12, 23-24 | NEW (dead imports) | `KeyEvent`, `CountDownLatch`, `TimeUnit` imported and unused. | Delete. | None. |
| 8 | 132-178 | T4 (partial) | `selectingSecondRealDocumentClearsFirstPreview` also runs both share assertions and the Ask-Alpha review; share is also covered by `CameraFlowInstrumentedTest:96-98` and `PhotosMultiShare`. | Keep (different item type: document vs photo). No change. | — |
| 9 | 196-217 | D9 | Rename test: nested `try/catch(AssertionError)` building a diagnostic JSON from five sources (lines 209-213). | Extract `renameDiagnostic(...)`; keep behaviour. | None. |
| 10 | 113-118 | D8 | Picker navigation state machine on 300-char lines. | Formatter, named predicates (`inDocumentsUi(n)`). | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `fixture` / `fixtureBytes` (MediaStore Downloads insert, IS_PENDING publish) | helper | 49-66 | `CameraScan`, `Notes`, `BrowserFlow` borrow it; `PhotosLibrary`/`PhotoLibrary` tests insert MediaStore images separately | `DocumentsUiPicker` (or `MediaStoreFixture`) |
| `selectDocument` + `find`/`press`/`textEquals`/`hasAncestorId`/`pickerDiagnostics` | helper | 74-131 | `ShareFlowAssertions.nodes:63-67` (node walk), `SettingsRoles.dialogNode` | `DocumentsUiPicker` |
| `eval`, `waitFor`, `click` | helper | 33-48 | ~70 poller copies | `WebViewTestDriver` |
| `sha256` | helper | 266 | ~30 copies | shared digest helper |
| `plugin` | helper | 267-271 | ~30 promise helpers | `WebViewTestDriver.awaitPromise` |
| `openFiles`, `preview` | helper | 179-180 | `NotesDocument` has similar view-open helpers | keep local |

## Proposed end state
`DocumentsUiPicker.java` (~95 lines) owns MediaStore fixtures and the DocumentsUI driver; this class keeps its 7 tests (~210 lines)
on shared driver helpers and a small restart-phase helper. Phase/argument names, SharedPreferences names and method names stay
(pinned by `scripts/test-native-restart.ts` and `test/android-instrumentation-runner.test.mjs:614`).

## Verification
`node scripts/android-instrumentation.ts --classes SelectedDocument`; `node scripts/test-native-restart.ts document …` and
`… source-reference …`; plus the borrowers: `--classes CameraScan,NotesDocument,BrowserFlow`. `node --test test/android-instrumentation-runner.test.mjs`.
