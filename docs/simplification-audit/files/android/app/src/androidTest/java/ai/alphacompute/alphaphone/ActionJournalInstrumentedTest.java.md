# android/app/src/androidTest/java/ai/alphacompute/alphaphone/ActionJournalInstrumentedTest.java
- Lines: 109 | Role: AlphaActionJournal through the real WebView bridge: reservation races, encryption at rest, recreation, idempotent finish, Maps redaction. | Verdict: SIMPLIFY
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:265` (`ActionJournal: {}`); no source-text test. Slot names `action-journal:v1:<scope>:entry:<id>` / `:index` mirror `AlphaActionJournal.java:16` (`ActionJournalConfiguration.standard("action-journal:v1")`).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 21-24 | C3 | Local SHA-256 hex `hash(String)`; androidTest already has `ResidentTestFixture.hash(byte[])` (:18) and `PhotosTestFixture.hash` (:31) plus 8 more private copies. | Use `ResidentTestFixture.hash(value.getBytes(UTF_8))` (or one `TestHashes.sha256Hex`). | None. |
| 2 | 25-37 | C3 | `call(expression)`: set `window.__x=null`, run promise, poll for JSON, unwrap with JSONTokener. Same shape in AppInfo:27-31, AssistantInstrumentedTest:21-30, BrowserPageQuestion:76-81, ~dozens more. | Add `WebViewTestDriver.call(String promiseExpr)` returning `JSONObject` (`{error:true}` on rejection). | Low. |
| 3 | 43-44, 69-71 / 79-80, 106 | C3/C4 | Slot file path `new File(noBackup,"connection-credentials")` + `hash(slot)` + cleanup over `"",".bak",".new"` suffixes is written twice here and reimplemented in 14 androidTest files (grep `connection-credentials`). It encodes `AlphaCredentialStore`'s on-disk layout in tests. | One `CredentialSlotFiles.path(context, slot)` / `deleteSlot(context, slot)` helper in androidTest; better, call the store's own delete API for cleanup. | Low. |
| 4 | 38-72 | D8 | Dense one-line assertions (`done.put(...);assertTrue(...);done.remove(...)` on one line). | Formatter pass. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `hash` | helper | 21-24 | ResidentTestFixture:18, PhotosTestFixture:31, NoteOrigin:51, NoteAudioMetadataEncrypted:13, SelectedDocument:266, ResidentEgressRedaction:43, CombinedAgent:26, CombinedAgentRestart:26, PairedMaps:27, PairedReminder:27 | one androidTest `TestHashes.sha256Hex` |
| `call` | helper | 25-37 | AppInfo:27, Assistant:21, BrowserPageQuestion:76-81 | `WebViewTestDriver.call` |
| slot-file cleanup | inline | 69-71, 106 | 14 files with `connection-credentials` | `CredentialSlotFiles` |

## Proposed end state
~95 lines: two @Test methods unchanged in behaviour; shared hash, bridge-call and slot-file helpers; one `cleanup(scope,id)` used by both finally blocks.

## Verification
`npm run test:android:instrumentation -- --owned-emulator --classes ActionJournal` (both variants).
