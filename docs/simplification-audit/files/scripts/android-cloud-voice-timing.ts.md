# scripts/android-cloud-voice-timing.ts
- Lines: 211 | Kind: script (manual device diagnostic: reads voice timing from a debug WebView over DevTools) | Verdict: DELETE
- Covers: attaches to the running debug app's WebView via `adb forward`, evaluates JS that reads `alphaphone:voice-timing:v1`, `AlphaVoiceCloud.cloudVoiceTiming()`, `AlphaCloudSpeechStream.cloudStreamTiming()` and provider status, and prints sanitized numbers. Duplicates: the in-app diagnostics export (`apps/app/src/runtime/diagnostics-export.ts`) already produces the same voice-timing and native-timing documents for `aggregate-voice-latency.ts`. Callers/importers: only `test/android-cloud-voice-timing.test.mjs` (unit, T3); no npm, workflow, doc or script caller (git grep).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | A7 | Unwired manual tool, overlapping the product's own diagnostics export. | Delete with its test. | Low |
| 2 | 128-136 | A1 | `sanitizeBuild` still recognises the removed `cloud` runtime profile ("An APK from before the profiles were merged"). | Gone with the file. | — |
| 3 | 15 | C6/D5 | Fourth copy of the voice route list, including `paired-agent`. | Gone with the file. | — |
| 4 | 158 | C3 | Uses bare `adb` from PATH instead of `toolchain.ts`. | Gone with the file. | — |

## Proposed end state
Deleted together with `test/android-cloud-voice-timing.test.mjs`. Coverage lost: none of product behaviour; a developer reads voice timing through Settings' diagnostics export instead. Owner question only if someone still uses this CLI against debug builds.
