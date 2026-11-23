# android/app/product.gradle
- Lines: 160 | Role: Alpha's Gradle-time product inputs applied by the generated host (`android/consumer-host.json:114` `appScripts`): ABI selection, App Link host, update manifest/channel, BuildConfig fields, four Node verification `Exec` tasks on `preBuild`, a stale-renderer guard. | Verdict: SIMPLIFY
- Importers: generated host via `android/consumer-host.json:114`; `scripts/android-host.ts` (copies/declares it). Text/path pins (many — implementers must update together):
  `test/update-channel-gradle.test.py:10-11` (T2: slices `'// One-tap app update'` … `'\nandroid {'` and runs it under Groovy),
  `test/one-runtime-profile.test.mjs:54-57` (regex on lines 8-9 refusal and line 95),
  `test/android-host.test.mjs:105-110` (path; task names `verifyEmbeddingHost`, `verifyParadeeAppLinkage`, `verifyVoiceHost`, `verifyRuntimeWebProfile`),
  `test/app-update.test.mjs:95` (line 98 text), `test/google-workspace-return-native.test.mjs:87` (line 90 text),
  `test/cloud-sign-in-flow.test.mjs:78`, `test/release-signing.test.mjs:177`, `test/login-surfaces.test.mjs:242` (message), `test/android-app-abi-selection.test.py:29` (reads source), `test/gradle-verification.test.mjs:18` + `scripts/gradle-verification.ts:55` (mirror-free scan), `scripts/source-snapshot.ts`, `scripts/verify-apks.ts:137`, `scripts/render-assetlinks.ts:28`, comments in `GoogleWorkspaceReturn.java:10`, `apps/app/src/runtime/google-workspace-return.ts:3`, `AndroidManifest.xml`, `README.md`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-9 | A1 / A8 | `if (project.hasProperty('ELIZA_RUNTIME_PROFILE') \|\| project.hasProperty('ELIZA_LOCAL_EMBEDDINGS')) throw … 'There is one runtime profile now…'` — refusal of removed options. Both entry points already strip these (`scripts/build-android.ts:89`, `scripts/gradle-verification.ts:278`). | Delete lines 8-9 and the regex in `test/one-runtime-profile.test.mjs:57`. | Low |
| 2 | 33-38 | B3 / D5 | `ELIZAOS_APP_LINK_HOST` input: read, trimmed (again — `envValue` already trims), DNS-regex-checked, then required to equal `cloudWebHost`. Nothing sets it (grep: no setter in scripts, workflows, upstream). Since the only accepted value is `cloudWebHost`, the input and regex are dead. | Replace 33-38 with `def appLinkHost = cloudWebHost`. Fix comment at 96 ("or \"\" when none" is false — it is never empty). | Low |
| 3 | 43-79 | C7 / B3 | 37-line private-QA admission (no-follow open, inode/mtime re-check, uid/mode, signed-URL parse) duplicates `scripts/update-channel.ts:35-56` `readUpdateChannel`, which both `build-android.ts:31` and `build-archive.ts:17` run before Gradle. The two copies already **diverge**: Node lower-cases query keys ("gcloud emits lowercase signing fields", `update-channel.ts:50-55`), Gradle requires exact `X-Goog-Algorithm`/`X-Goog-Expires` (line 76), so a gcloud-lowercase URL passes Node and is refused by Gradle. | Keep Node as the single admission. In Gradle keep only: read `ALPHA_PRIVATE_UPDATE_MANIFEST_FILE` (≤2048 bytes) and require its SHA-256 to equal `ALPHA_PRIVATE_UPDATE_MANIFEST_SHA256` (already admitted by Node), ~8 lines. Delete or shrink `test/update-channel-gradle.test.py` (T2 transplant) to the digest check. | Medium (direct `./gradlew` with private-qa env bypasses Node; owner to accept that builds go through `npm run android:build`) |
| 4 | 13, 17-18, 22, 25, 33 | C3 | Five spellings of "Gradle property or env var": `findProperty(x) ?: System.getenv(x)`, `== null` fallback, `?:` chain with default, `envValue` closure. | One closure `def input = { String n -> project.findProperty(n)?.toString()?.trim() ?: envValue(n) }` used everywhere. | Low |
| 5 | 19-21, 138-139 | C3 | Same ABI list validation twice (`runtimeAbis`, `selectedParadeeAbis`): non-empty, unique, subset of `['arm64-v8a','x86_64']`. | One `def abiList = { raw, name -> … }` helper. | Low |
| 6 | 117-149 | P1 / D9 | Four separate `Exec` tasks each spawn Node on every `preBuild` (`stage-embedding-host.ts --verify`, `runtime-profile.ts --verify-native`, `paradee-runtime.ts --app-linkage`, `voice-host.ts --verify`). | Owner/perf: one `scripts/verify-android-inputs.ts` entry that runs the four checks in-process, one `Exec`. Update `test/android-host.test.mjs:110` task names. | Medium (each script has its own flags: `--allow-unpackaged-runtime`, `--allow-absent`, ABI args) |
| 7 | 151-159 | A1 / B3 | `verifyRuntimeWebProfile` rejects synced assets whose `build-flags.json` names a `runtimeProfile` ("removed Cloud profile"). `scripts/build-android.ts:304-307` already refuses the same condition on `web-dist/build-flags.json` before sync. | Delete task (9 lines) and its name from `test/android-host.test.mjs:110`. | Low |
| 8 | 105-108 | B1 | `sourceGit` swallows every exception → `null` → commit `'unknown'`, dirty `true`. This is the specified fallback (dirty trials are rejected by the aggregator, line 104). | Keep; add the word "specified" to the comment. | — |
| 9 | 40-42 | B3 | Validates `app.config.json` `updateManifestUrl` scheme/host — our own reviewed config, also consumed by Node scripts. | Keep (cheap, build-time trust boundary for a config file); optional. | — |
| 10 | 1-7, 11-16 | A8 | Header comments partly narrate history ("There is one runtime profile. Every build packages…"). | Trim to what the file does now when #1 lands. | — |
| 11 | 1-160 | D8 | Single-space indentation, 200+ char conditions (line 60, 68, 72). | Formatter pass with the Gradle/Groovy formatter chosen for D8. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `envValue` | helper (closure) | 25 | property/env reads at 13, 17-18, 22, 33 | single `input` closure in this file |
| runtime ABI validation | helper (inline) | 19-21 | 138-139; `scripts/stage-local-agent-runtime.ts` ABI selection | local closure |
| private-QA admission | helper (inline) | 50-79 | `scripts/update-channel.ts:24-57` `readUpdateChannel` | Node only |
| `sourceGit` | helper (closure) | 105-108 | `git()` wrappers in scripts (C3, 17×) | stays (Gradle-side) |

## Proposed end state
Lines 8-9, 33-38 (→1 line), 151-159 deleted; private-QA block cut to a digest check (~8 lines); property/env and ABI checks through two small closures; optional single verify `Exec`. Remains: ABI selection, App Link host = generated production host, update manifest/channel placeholders and BuildConfig fields, source commit fields, voice/embedding/native-host verification. Estimated ~105 lines (≈95 if the four Exec tasks merge).

## Verification
`node --test test/one-runtime-profile.test.mjs test/android-host.test.mjs test/app-update.test.mjs test/google-workspace-return-native.test.mjs test/cloud-sign-in-flow.test.mjs test/release-signing.test.mjs test/login-surfaces.test.mjs test/gradle-verification.test.mjs test/update-channel.test.mjs test/verify-apks.test.mjs`; `python3 test/update-channel-gradle.test.py` (needs JAVA_HOME/GRADLE_LIB) and `test/android-app-abi-selection.test.py`; `npm run android:build:local` for both variants plus a private-qa build through `build-android.ts`.
