# android/app/src/androidTest/java/ai/alphacompute/alphaphone/AssistantResidentReuseInstrumentedTest.java
- Lines: 101 | Role: repeated ACTION_ASSIST invocations attach to a synthetic running resident without retiring Home work or enrollment. | Verdict: DELETE (with P-78 deferral) — owner decision
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:187`; `scripts/owner/emulator-campaign-check.ts:42,57`. Test hooks in main: `AlphaLocalAgentPlugin.enrollForTest`, `launchedGenerationForTest`, `adoptStreamForTest`, `attachForTest`, `lifecycleEpochForTest`, `ownedWorkCount`, `enrollmentPresent`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 50-51 | A4 | `BoundedActivityScenario.launch(new Intent(context, AlphaAssistActivity.class))` — the activity is `android:enabled="false"` (`AndroidManifest.xml:124`) and nothing enables it, so the explicit start throws; the class cannot pass on current builds (manifest reading; not run here). | Delete with P-78 deferral, or move to `NOT_RUN_BY_A_RUNNER` with that reason. | Low; owner decision. |
| 2 | 41-45, 55-56, 78-82, 90 | D7 | Main-source hooks used by no other test or product code: `attachForTest`, `lifecycleEpochForTest`, `adoptStreamForTest` (grep: only this file, AssistantInstrumentedTest and `AlphaLocalAgentPlugin.java`). `launchedGenerationForTest` and `enrollForTest` are also used by Quint traces (`specs/quint/refinement/native/ResidentCoordinatorTraces.java`, `ResidentStartCancelReplay.java`). | Delete `attachForTest`, `lifecycleEpochForTest`, `adoptStreamForTest` from `AlphaLocalAgentPlugin.java` with this class and AssistantInstrumentedTest; keep the two Quint-used hooks until those traces change. | Medium: main-source edit. |
| 3 | 26-29 | — | Synthetic runtime JSON (`state/serviceActive/socketListening`) mirrors the resident observation shape; refusal codes `provider-changed,runtime-changed,runtime-not-running,provider-unadmitted` asserted here only. | If the attach-admission rule must stay covered after deletion, it belongs in the resident attach path tests (`ResidentServiceInstrumentedTest`) through MainActivity, not ACTION_ASSIST. Check that coverage before deleting. | Medium. |
| 4 | 64, 63 | C3 | DESTROYED poll loop copy (see AssistantInstrumentedTest #5). | — | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `runtime(state,service,socket)` | helper | 27-29 | resident fixtures in ResidentTestFixture | deleted |
| `agent(activity)` | helper | 30-32 | `getBridge().getPlugin("Agent").getInstance()` cast in AssistantInstrumentedTest:76,87 | deleted |

## Proposed end state
File deleted (-101), registry + owner-campaign entries removed, three main-source `*ForTest` hooks removed. Owner confirms attach-refusal coverage lives in a MainActivity resident test.

## Verification
`node --test test/android-instrumentation-runner.test.mjs test/owner-emulator-campaign-check.test.mjs`; `npm run android:build:local`; `scripts/android-resident-instrumentation.ts` campaign if the attach rule moves.
