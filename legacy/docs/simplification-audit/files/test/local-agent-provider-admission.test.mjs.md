# test/local-agent-provider-admission.test.mjs
- Lines: 38 | Kind: upstream test re-run (`vendor/eliza/plugins/plugin-native-agent/test/provider-admission/NativeProviderAdmissionTest.java` on the host JVM against upstream `NativeProviderAdmission.java` + Alpha's `LocalAgentProviderAdmission.java` wrapper) plus source-text regexes over `AlphaLocalAgentPlugin.java`, the wrapper and the vendor class | Verdict: DELETE (regex half); the JVM run moves upstream or to Gradle (owner decision)
- Covers: Cloud provider admission (AP-04): Cloud and direct environments, credential expiry and match, rollback; the plugin delegates to the admission class; product builds refuse a direct (bring-your-own) key; model is `qwen-3.8-27b` on Cerebras. Duplicates: `specs/quint/refinement/native/resident-coordinator.mjs:13-15` compiles `LocalAgentProviderAdmission.java` and upstream `NativeProviderAdmission.java` into the resident replay; `test/quint-*` resident models exercise admission through it. Callers/importers: `npm test` glob; `jsonJarSkip` from `test/fixtures/jvm-tools.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13-15 | T5 | Runs upstream's own JVM test with Alpha's subclass on the classpath. The subclass adds only `PROVIDER_SLOT` and constants. | Delete here; upstream CI owns `NativeProviderAdmissionTest` (follow-up, D14). | Low |
| 2 | 17-38 | T1 | Ten regexes pin one-line Java delegations and the model id string; the `directProviderAllowed` region is sliced by `indexOf`. | Delete. "No direct key in production" is a release rule: assert it on build output (production APK's `BuildConfig.ELIZA_DEV_ALLOW_TEST_MOCKS=false` is already audited by `verify-apks`). | Low |
| 3 | 1-3, 32-33 | A8 | Comments cite "#410 (main, 2026-10-13)". | Gone. | Low |

## Proposed end state
File deleted. Provider admission is covered by the resident Quint replay (which compiles the real classes) and by
upstream's own test; the production refusal of direct keys follows from the test-mocks flag that the APK audit checks.
