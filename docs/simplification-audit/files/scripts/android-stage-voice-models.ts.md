# scripts/android-stage-voice-models.ts
- Lines: 205 | Kind: script (stages operator-supplied on-device voice outputs by recorded size/SHA-256) | Verdict: KEEP, SIMPLIFY
- Covers: finds every row of `android/voice-host/qualified-voice-host.json` in `--from` directories, verifies bytes, copies the bundle into `.eliza/paradee-voice/native`, writes the bundle manifest and build record, and installs engine/STL into `jniLibs`; `--unrecorded-engine` for hosted CI rebuilds. Duplicates: streamed SHA-256 (43-47) is one of ~40 hash helpers; "exists with other bytes" checks are written twice (75-87 for host libraries, 160-164 for bundle rows). Callers/importers: workflows `android-emulator.yml`, `resident-android.yml:238`; README; `android-build-preflight.ts`, `voice-host.ts` (messages); `qualified-voice-host.json`; listed in `source-snapshot.ts`; tests `android-stage-voice-models.test.mjs`, `voice-host-record.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 43-47 | C3 | Streamed file digest helper. | `scripts/lib/hash.ts` `sha256File`. | None |
| 2 | 75-112, 158-169 | C4/B5 | Two publication paths: host libraries go through temp copy, re-hash, hard link and an EEXIST race handler with "concurrent stager" comments; bundle rows use plain `copyFileSync(COPYFILE_EXCL)`. Concurrent staging in one checkout is not a real scenario. | One `stageVerified(source, destination, row)` used for both: refuse different existing bytes, copy, verify. | Low |
| 3 | 54, 76-80, 158-159 | B3 | Symlink-traversal checks on destinations inside our own checkout. | Keep the input-side symlink refusal (operator input is the trust boundary); drop destination-path walking. | Low |
| 4 | 184-199 | C3 | Own parsing after `abiArguments`. | `parseArgs` with `--from` multiple, `--plan`, `--unrecorded-engine`. | None |
| 5 | 140 | D8 | Two statements on one line mutating the record. | Split; name the admission string constant. | None |

## Proposed end state
~150 lines with one verified-copy routine and shared hash/args helpers; identical outputs and CLI. `test/android-stage-voice-models.test.mjs` already stages into temp dirs (integration-shaped): keep it as the single test.
