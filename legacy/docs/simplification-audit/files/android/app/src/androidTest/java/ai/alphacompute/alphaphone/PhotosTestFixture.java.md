# android/app/src/androidTest/java/ai/alphacompute/alphaphone/PhotosTestFixture.java
- Lines: 32 | Role: shared Photos androidTest helpers: real touch injection on a tile, owned JPEG fixture insert, byte read, SHA-256. | Verdict: SIMPLIFY
- Importers: `PhotosMultiShareInstrumentedTest` and `PhotosBatchInstrumentedTest` (`import static ...PhotosTestFixture.*`). Text/path pins: none (no test/spec/script names it).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 21-22, 26 | B5 | Diagnostic tracing: installs `window.__photoTouchTrace` pointer listeners and prints `ALPHA_PHOTO_TOUCH_BEFORE/AFTER` to stdout. grep `ALPHA_PHOTO_TOUCH`/`__photoTouchTrace`: no reader in scripts/, test/, .github. | Delete the three lines (and the listener install); keep the touch injection itself. | none |
| 2 | 31 | C3 | `hash(byte[])` SHA-256 hex loop; identical copies: `ResidentTestFixture.hash` (`:18`), `ResetExternalFixtureInstrumentedTest.sha` (`:26`), `ReminderDeletionStorageInstrumentedTest.slotHash` (`:25-29`), `ResidentEgressRedactionInstrumentedTest.sha256` (`:43`), `ActionJournalInstrumentedTest.hash` (`:21`), `ConnectionInstrumentedTest` (`:27`), `CombinedAgent*`, `DeviceAction`, `InboxDraft` ... | One `TestDigests.sha256Hex(byte[])` in androidTest (or reuse `ResidentTestFixture.hash`). | none |
| 3 | 29 | C3 | `fixture(resolver,prefix,color)` = the same owned-JPEG insert as `PhotosTrashInstrumentedTest.fixture` (`:67-71`) and the inline copy at `PhotosTrash :42-47`. | Make this the single owned-image fixture; PhotosTrash calls it. | none |
| 4 | 17 | C3 | Private `until` poll (150x100 ms) duplicating `WebViewTestDriver`-style polls in every Photos test. | `WebViewTestDriver.until`. | none |
| 5 | 29 | D8 | One 600-character line for the fixture insert. | Format (one statement per line). | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `until` | helper | 17 | ~42 androidTest files | `WebViewTestDriver.until` |
| `touch(Uri,long)` | helper | 19-27 | none (real `MotionEvent` injection is unique) | keep here |
| `fixture` | helper | 29 | `PhotosTrashInstrumentedTest.java:42-47, 67-71` | keep here (single owner) |
| `bytes` | helper | 30 | `PhotosTrashInstrumentedTest.java:34` | keep here |
| `hash` | helper | 31 | 10+ copies (see finding 2) | `TestDigests.sha256Hex` |

## Proposed end state
Keep `touch`, `fixture`, `bytes` as the one Photos fixture helper (also used by PhotosTrash). Delete the touch-trace
diagnostics (3 lines), move `hash` to a shared digest helper and `until` to `WebViewTestDriver`. ~24 lines.

## Verification
`PhotosMultiShare`, `PhotosBatch` (`-e photosBatch 1`), and `PhotosTrash` once it adopts `fixture/bytes`; all via `scripts/android-instrumentation.ts --owned-emulator`.
