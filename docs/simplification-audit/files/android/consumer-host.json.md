# android/consumer-host.json
- Lines: 189 | Role: Alpha's Android host descriptor fed to the upstream generator (`vendor/eliza/packages/app/scripts/mobile/android/consumer-host.mjs`, run by `scripts/android-host.ts`): SDK profile, flavors, modules, app dependencies, test-mocks source sets, admission commands, generated sources, and the `residentHost` identity (sockets, notification copy names, hooks, helper sources). | Verdict: SIMPLIFY
- Importers: `scripts/android-host.ts`, `scripts/build-android.ts`, `scripts/stage-local-agent-sources.ts` (`residentHost`), `scripts/verify-apks.ts`, `scripts/gradle-verification.ts`, `scripts/pinned-upstream-source.ts`, `scripts/quint-lib.ts`, `scripts/source-snapshot.ts`, `scripts/owner/merge-review.ts`, `scripts/ci/calendar-bridge.py`, `scripts/ci/resident-native.py`, `android/app/product.gradle`; also listed as its own `generationInputs` (line 116).
  Text/path pins: `test/android-host.test.mjs:73,93,119,122,131,150-170` (flavor/test-mocks manifest paths, exact list of `appDependency:false` modules incl. `video-fixture`, webkit coordinate, residentHost strings/hooks/classes/helpers), `test/alpha-system-entry.test.mjs:99-127` (residentHost notification), `specs/quint/native/manifest.json`, `specs/quint/services/manifest.json`, Quint native refinements (`action-recovery.mjs`, `app-info-handoff.mjs`, `assistant-entry.mjs`, `crash-journal.mjs`, `gmail-background.mjs`, `mms-dispatch.mjs`, `settings-handoff.mjs`, `sms-dispatch.mjs`), `README.md`, `.gitignore`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 46 | A7 | `{ "name": "video-fixture", … "appDependency": false }` — no script, workflow or package.json builds `:video-fixture` (android research §3); only its `qa-source.mp4` asset is read by browser specs (`scripts/ci/affected.ts:14`). | Delete the entry with the module; move `qa-source.mp4` to `test/fixtures/`; update `test/android-host.test.mjs:119,122` and `scripts/ci/affected.ts:14`. | Low |
| 2 | 50-53, 55-56 | A7 / NEW (re-declared transitive dependency) | App-level `implementation` of `androidx.credentials:credentials:1.6.0`, `credentials-play-services-auth:1.6.0`, `googleid:1.1.1`, `androidx.browser:browser:1.9.0` duplicates `.eliza/patched-native/*/packages/auth/android/build.gradle:16-19` (same coordinates, `implementation`); `androidx.media3:media3-transformer/effect:1.11.1` duplicates `plugins/plugin-native-media/android/build.gradle:15-16`. No Alpha source imports these packages (grep `android/app/src`: 0 for media3/credentials/googleid; `androidx.browser` only as a manifest query string). | Delete the six coordinates; the resolved graph is unchanged (auth module already forces browser 1.9.0 over browser-surface's 1.8.0). Re-run `scripts/gradle-verification.ts` to confirm `verification-metadata.xml` needs no change. | Low |
| 3 | 54 | — (correction) | Research said OkHttp "is not used by any product file". It is required at runtime: `android/local-speech/build.gradle:53` declares `compileOnly 'com.squareup.okhttp3:okhttp:5.3.2'` for the Paradee `speech-bridge` (`SpeechStreamBridgePlugin.java`), so the app must supply it. | Keep; add nothing (JSON has no comments) — note it in the local-speech build file instead. | High if deleted |
| 4 | 43-45 | A4 / P14 | `sense`, `sense-speech` (development-only while P-78 is open) and `notification-fixture` (built only by the manual `scripts/build-notification-fixture.ts` campaign and `scripts/gradle-verification.ts:36`). | Owner decision; delete entries with the modules if retired. | Medium |
| 5 | 144-164 | C6 | `residentHost.notification.strings` maps 19 keys to names that are mechanically `alpha_runtime_` + snake_case(key). | Upstream schema owns the shape; optional upstream change to accept a prefix. Leave. | — |
| 6 | 3 | — | Long `description` prose is accurate (generator owns Gradle). | — | — |
| 7 | 61-65 | — | Test dependencies (`uiautomator`, `espresso-accessibility`) are used by androidTest (13 and 2 files). Keep. | — | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `residentHost.notification.color` `0xff0000ff` | const | 142 | `#0000FF` in `values/alpha-launcher.xml:3`, both `styles.xml`, `drawable/app_icon.xml:4` | stays (schema needs a literal) |
| `residentHost.notification.smallIcon` `notification_icon` | const | 140 | resource `drawable/notification_icon.xml` | — |
| sockets `ai.alphacompute.alphaphone.*.v1` | const | 128-130 | installed-identity names (P6) | keep |

## Proposed end state
~181 lines: six redundant dependency coordinates and the `video-fixture` module removed; `sense`/`sense-speech`/`notification-fixture` removed too if the owner retires them (~178). Everything else is generator input and stays.

## Verification
`node --test test/android-host.test.mjs test/alpha-system-entry.test.mjs`; `node scripts/android-host.ts` (regenerate) then `npm run android:build:local` for both flavors; `node scripts/gradle-verification.ts`; Quint native manifest check (`specs/quint/native/manifest.json` pins this file's digest — re-pin).
