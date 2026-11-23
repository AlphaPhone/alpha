# android/app/src/androidTest/java/ai/alphacompute/alphaphone/ResidentTestFixture.java
- Lines: 56 | Role: shared static helpers for the two resident tests (SHA-256, bounded read, native GET, /proc process identity, owner/agent reply checks). | Verdict: SIMPLIFY
- Importers: 2 — `ResidentServiceInstrumentedTest` (static import + 4 wrappers at :67-70, `nativeGet` :74,:101, `hash`/`fileHash`/`boundedHash`), `ResidentWorkflowCrashInstrumentedTest` (static import + 4 wrappers at :147-150). Text/path pins: none.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 18, 20-24, 25 | C3 | Three SHA-256→hex implementations in one 56-line file: `hash(byte[])`, `boundedHash(InputStream,long)`, `fileHash(File)` each with its own `String.format("%02x")` loop. | Keep one `sha256Hex(InputStream in,long max)`; `hash(bytes)` = `sha256Hex(new ByteArrayInputStream(bytes),bytes.length)`; `fileHash(f)` = `sha256Hex(new FileInputStream(f),Long.MAX_VALUE)`. Also replaces `TrustedPackagedWorker.sha` (:19), `SelectedDocumentInstrumentedTest.sha256` (:266), `ShareFlowAssertions` (:78), `SpeechPipelineTraceInstrumentedTest.sha` (:34) — 30 androidTest files format `%02x` (grep). | None. |
| 2 | 26-29 | C5 | `nativeGet` builds the same request envelope as the private `nativeCall` copies in `ResidentServiceInstrumentedTest:24-30` and `ResidentWorkflowCrashInstrumentedTest:28-39`. | Move one `nativeCall(path,method,body,bearer)` here (status check + body parse) and a `ResidentSession` (bearer, identity, `startAndEnroll`, `request`) used by both tests; delete `nativeGet`. | Low; the crash test's failure categorisation (`apiFailureDiagnostic`) must stay as an optional hook. |
| 3 | 42 | B1 | `catch(IOException|ErrnoException raced){/* Other processes may exit… */}` | Keep (documented /proc race). | None. |
| 4 | 50 | NEW (typo) | `"…did not stop within30s"` missing space. | Fix while touching. | None. |
| 5 | 53, 55 | D8 | Assertion chains on one line. | Formatter. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `hash` / `boundedHash` / `fileHash` | helper | 18-25 | `TrustedPackagedWorker.sha:19`, `SelectedDocumentInstrumentedTest.sha256:266`, `SpeechPipelineTraceInstrumentedTest.sha:34`, `ShareFlowAssertions:78`, `ShareReceiverActivity:31`, ~25 more androidTest files | one androidTest `TestDigests.sha256Hex` (or this class) |
| `bounded(InputStream,int)` | helper | 19 | `ResidentWorkflowCrash` uses it; main has 7 bounded readers (research P9) | keep here |
| `nativeGet` | helper | 26-29 | `nativeCall` in ResidentService:24, ResidentWorkflowCrash:28 | replace with shared `nativeCall` |
| `processStart(int)` | helper | 30 | `WorkflowSurvivorInventory.processIdentity` (upstream/generated) reads the same `/proc/<pid>/stat` field | keep |
| `ownedChild`, `stopped`, `owner`, `agent` | helper | 32-55 | wrappers re-declared in both callers (pass-through, D4) | keep here; delete the caller wrappers |

## Proposed end state
One digest helper, one `nativeCall`, a small `ResidentSession` holding `ownerBearer/ownerIdentityId` and `startAndEnroll()` (moved
from both tests), plus the existing /proc helpers. ~70 lines here, removing ~75 lines across the two callers.

## Verification
`scripts/ci/resident-native.py` (`trusted`, `lost-rpc` phases) and `scripts/android-resident-instrumentation.ts`
(ResidentService). Both are emulator/disposable-user campaigns; compile is checked by `npm run android:build:local` (androidTest APK).
