# android/app/src/main/java/ai/alphacompute/alphaphone/AlphaKeyboardDictationService.java
- Lines: 204 | Role: launcher-flavor IME ("Voice typing") that records with `LocalVoiceRecording`, transcribes through the owner's selected voice provider (`KeyboardDictationCloud`) and commits text into the same, unchanged field; never sends. | Verdict: SIMPLIFY (small)
- Importers: declared only in `src/launcher/AndroidManifest.xml` (the main manifest must not contain it: `test/keyboard-dictation.test.mjs:15`); `MainActivity.refreshKeyboardInsets/beginKeyboardReturn` are called from here. Text/path pins: `test/keyboard-dictation.test.mjs:14-15,64` (manifest regex + javac compile with stubs), `test/apk-keyboard-dictation.test.mjs:13`, `test/aosp-fresh-presets.test.py:93`, `test/cloud-voice-profile.test.mjs`, `scripts/apk.ts:92,171-177` (APK permission audit), `test/support/feature-parity.mjs`, `specs/quint/native/manifest.json`, `specs/quint/refinement/native/main-activity-platform.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 44, 197 | C3 | `policy.state() == RECORDING || policy.state() == TRANSCRIBING` written twice. | `private boolean active()` (or `KeyboardDictationPolicy.active()`). | none |
| 2 | 106-114 | P8, B2 | `allowedNow()` is a seventh "owner foreground" variant (uses `isKeyguardLocked`, not `isDeviceLocked`) and null-checks `KeyguardManager`, `PowerManager`, `AudioManager`, which always exist on a phone; line 128 then calls `getSystemService(AudioManager.class)` without a null check. | Drop the three `!= null` checks; keep the predicate (IME semantics differ from Activity foreground, so do not fold into `OwnerSurface`). | none |
| 3 | 60 | D8 | `(getResources().getConfiguration().uiMode & 0x30) == 0x20` magic numbers. | `Configuration.UI_MODE_NIGHT_MASK` / `UI_MODE_NIGHT_YES`. | none |
| 4 | 134, 145-146 | C6 | Context window literal `64` used four times (`getTextBeforeCursor(64, 0)`, `getTextAfterCursor(64, 0)`). | `private static final int FIELD_CONTEXT = 64;`. | none |
| 5 | 140, 172, 174 | B1 | `catch (Exception error)` → fixed user message (e.g. "Configure voice in Alpha and allow microphone access to use voice typing."). The message is the specified product copy; the cause is lost. | Keep the copy; log `error.getClass().getSimpleName()` (no text) for diagnosis. | none |
| 6 | 93-95 | D8 | `android.provider.Settings.Secure`, `android.content.ComponentName` fully qualified inline; local `selected` shadows the field `selected` (line 35). | Import; rename the local to `current`. | none |
| 7 | 30, 203 | P10 | Own `Executors.newSingleThreadExecutor()` and raw `worker.execute` + `catch (RejectedExecutionException closed)` (176). A Service, not a Plugin, so `PluginWorkers` does not strictly apply, but `PluginWorkers.submit(worker, task, refused)` expresses lines 157-179 directly. | Use `PluginWorkers.submit`. | none |
| 8 | 45, 135, 166 | D3 | Static calls to `AlphaLocalAgentPlugin.credentialAuthorityEpoch()` (plugin used as service locator). | Follows the `CredentialAuthority` extraction (research P2); call site changes only. | low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `allowedNow()` | helper | 106-114 | P8 foreground family (different semantics: IME) | stays here |
| `text(CharSequence)` | helper | 124 | null-to-empty helpers are common; no exact Java twin found in main | stays |
| `monitor` | Runnable | 42-48 | none | stays |

## Proposed end state
~195 lines: `active()` helper, no impossible null checks, named constants, `PluginWorkers.submit`, imports. Dictation flow, policy fences and all user-visible strings unchanged.

## Verification
`test/keyboard-dictation.test.mjs` (javac compile; update stubs if signatures move), `test/apk-keyboard-dictation.test.mjs` and `scripts/apk.ts` audit (manifest only), Quint `KeyboardDictationCloudTraces`, launcher APK build, and a manual IME run on an emulator (an APK build does not prove dictation works).
