# scripts/voice-host.ts
- Lines: 281 | Kind: build/release script module + CLI (on-device voice host record: schema check, admission of packaged voice bundle bytes, staging-state guard) | Verdict: KEEP, SIMPLIFY
- Covers: the committed `android/voice-host/qualified-voice-host.json` is well-formed and matches the pin/app id/ASR slot; staged voice outputs and packaged APK voice bundles are byte-identical to it; absent voice is accepted only in the explicit unpackaged developer lane. Duplicates: `readJson` (65) and `digest` (150) are C3 twins; ABI list overlaps `android-abis.ts`. Callers/importers: `.github/workflows/resident-android.yml:240,276` (`--verify`, `--verify --allow-absent`), `android/app/product.gradle`, `android/sense-speech/build.gradle`, `android-build-preflight.ts`, `android-stage-voice-models.ts`, `generate-licenses.ts`, `verify-apks.ts`, `quint-lib.ts:29`, `source-snapshot.ts`, refinement `android-build-input-readiness.mjs`, `licenses/README.md`; tests `voice-host-record.test.mjs`, `voice-host-absent-admission.test.mjs`, `verify-apks.test.mjs`, `upstream-pin-guard.test.mjs`, `android-build-path.test.mjs`, `fixtures/voice-host-product.mjs`, `hosted-native-inputs.test.py`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 68–108 | B3 | 40-line hand validator of a committed, reviewed JSON file, run on every read; `readVoiceHost` then re-checks ASR rows against the slot record (119–124). | Keep the cross-file consistency checks (pin, identity, ASR slot, Paradee inputs); reduce the shape checks to what a reader actually depends on, or express them as one JSON Schema validated in one test-free place (`readVoiceHost`). | Low |
| 2 | 183–243 | B3/B4 | `voiceStagingState` walks every `src/*` overlay of two Gradle modules and two upstream vendor paths looking for "unrecognized" voice payloads, with link/non-directory/unbounded-inventory guards. It defends against hand-placed files and "old upstream outputs" (A1-flavoured: outputs of a retired staging path). | Keep the owner-folder check (`.eliza/paradee-voice/native` present/absent/partial); delete the vendor-path probe (198–201) after confirming the retired upstream stager no longer exists at the pin; keep the overlay scan only if a past incident motivated it (owner question). | Medium |
| 3 | 65, 150 | C3 | Local `readJson`, `digest`. | `scripts/lib/json.ts`, `hash.ts`. | None |
| 4 | 152 | B1 | `catch { /* reported below */ }` on manifest parse — the "missing or another format" difference is reported, so this one is specified behaviour. | Keep with the comment. | None |
| 5 | 148 | — | `typeof host === 'function'` lazy record load so APKs without voice never read the record. | Keep. | — |
| 6 | 22–26 | C6 | `VOICE_ABIS` duplicates the ABI list in `android-abis.ts` (`selectedAndroidAbis`). | Import from `android-abis.ts`. | Low |
| 7 | 276–281 | — | CLI with hand parsing. | `parseArgs`; fine as is. | None |

## Proposed end state
~200 lines: record reader with cross-file checks, `voiceBundleAdmission` unchanged, staging check limited to the owner folder (plus whatever overlay check the owner confirms is needed), shared helpers. Admission semantics and messages used by `verify-apks.ts` stay identical.
