# android/app/proguard-rules.pro
- Lines: 84 | Role: R8 keep rules for release builds (Capacitor reflection, upstream plugins, manifest components, WorkManager workers, JNI classes staged from upstream, AndroidX, coroutines, symbolication attributes). | Verdict: SIMPLIFY
- Importers: `android/consumer-host.json:77` (`proguardFiles`). Path pin: `scripts/source-snapshot.ts:20`. No test reads this file's text (`test/fixtures/google-browser-auth/native-sign-in.test.mjs:754` reads the *upstream* `vendor/.../app/proguard-rules.pro`).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11 | B4 | `-keep class com.getcapacitor.community.** { *; }` is a subset of line 9 `com.getcapacitor.**`, and no `com.getcapacitor.community` module is in `consumer-host.json` modules. | Delete. | None |
| 2 | 21 | A7 | `-keep class ai.elizaos.plugins.** { *; }` — the only package by that name is `ai.elizaos.plugins.bunruntime` (`vendor/eliza/plugins/plugin-native-bun-runtime`), which is not a module of this app (`consumer-host.json:24-48`). | Delete. | Low |
| 3 | 23-26 | B4 | `ai.eliza.plugins.agent.runtime.NativeProcessSupervisor` and `ai.eliza.plugins.browsersurface.**` are both inside line 20 `ai.eliza.plugins.** { *; }`. | Delete lines 23-26. | None |
| 4 | 38-41 | B4 | `HostedDeliveryWorker` and `ElizaTasksWorker` `{ *; }` keeps; lines 42-44 (`-keep class * extends androidx.work.ListenableWorker { <init>(Context, WorkerParameters); }`) already keep every worker's name and constructor, and lines 68-69 keep all of `androidx.**`. Correction to research P19: `ElizaTasksWorker` **does** exist — it is staged into `ai.alphacompute.alphaphone` from upstream `RESIDENT_HOST_CLASSES` (`vendor/eliza/packages/app/scripts/mobile/android/resident-host-sources.mjs:38`). | Delete lines 40-41. | Low |
| 5 | 28-36 | B4 (suspected) | Manifest components kept `{ *; }`. AAPT2 already emits keep rules for every manifest-declared class (name + default ctor). `{ *; }` additionally pins all members; only needed where members are reached by reflection (upstream keeps specific `ElizaAgentService` static methods for AgentPlugin — Alpha's rule covers that via `{ *; }`). | Replace `ElizaAgentService { *; }` with upstream's member-specific keep; delete the other seven lines. Verify with release `mapping.txt` + instrumentation on a minified build. | Medium |
| 6 | 58-59 | A8 | Comment with no rule: "Developer hooks are absent from release; registration is reflective…". | Delete. | None |
| 7 | 66-69 | owner | `-keep class androidx.** { *; }` / `-keep interface androidx.** { *; }` defeats most shrinking (research P19). Upstream does the same. | Owner question: measure APK size gain vs risk; if pursued, do it upstream first. | High if removed blindly |
| 8 | 2 | — | "Modelled on vendor/…/proguard-rules.pro" while diverging from it (upstream has member-specific `ElizaAgentService` keeps, no wholesale component keeps). | Keep pointer; after #5 the two align. | — |

## Local types and helpers
None.

## Proposed end state
Delete lines 11, 21, 23-26, 40-41, 58-60 (≈11 lines) → ~73 lines; with #5 (component keeps → one member-specific rule) ~66 lines. Capacitor, JNI (`native <methods>`), staged voice/inference class keeps, JavascriptInterface, coroutines and attributes stay.

## Verification
`npm run android:build:local` release variants; `scripts/verify-apks.ts`; diff `mapping.txt` before/after for the touched classes; instrumentation on a minified build (resident start, WorkManager delivery, mail PDF activity, notification listener).
