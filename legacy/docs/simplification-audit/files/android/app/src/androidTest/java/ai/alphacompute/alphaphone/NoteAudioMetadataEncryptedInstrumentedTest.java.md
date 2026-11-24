# android/app/src/androidTest/java/ai/alphacompute/alphaphone/NoteAudioMetadataEncryptedInstrumentedTest.java
- Lines: 33 | Role: plaintext legacy note-audio metadata JSON is migrated by `AlphaNoteAudio.describe` into the encrypted slot, retry after a crash is safe. | Verdict: DELETE
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:245` (`NoteAudioMetadataEncrypted: { args: { notesAudioEncryption: "1" } }`).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-31 | A1 | Javadoc: "Actual Capacitor describe -> legacy migration -> Keystore -> recreation"; method `legacyTranscriptMovesToEncryptedStoreWithoutLosingAudioOrTombstone` writes a plaintext `note-audio/<id>.json` that no current build writes. Its production counterpart is `AlphaNoteAudioPlugin.migrateLegacyMetadata` / `migrationStatus` / `migrationWorker` (`AlphaNoteAudioPlugin.java:49-55,231`) and the browser `migrationStatus()` (`apps/app/src/browser/voice.ts:346`) — all D1 deletions. | Delete the class and registry entry together with those legacy readers. | Low (D1) |
| 2 | 13 | C3 | Private SHA-256 hex helper. | Gone. | - |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `hash(String)` | helper | 13 | 30 androidTest copies | delete |
| `describe(id)` | helper | 14 | none | delete |

## Proposed end state
File deleted (0 lines).

## Verification
`node --test test/android-instrumentation-runner.test.mjs`; `NoteAudioInstrumentedTest` still passes `describe` on current-format records.
