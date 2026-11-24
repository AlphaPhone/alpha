# specs/quint/refinement/native/AssistantEntryTraces.java
- Lines: 438 | Kind: Quint refinement driver (host-JVM; real `AlphaAssistActivity`, `AlphaPowerVoiceActivity`, `AlphaQuickSettingsTile`, upstream `SenseListenerClient`, with a source edit injecting `beforeBridgeReentry`) | Verdict: KEEP (D7: assistant/Power invocation is a planned PRD feature)
- Covers: assistant and Power-key invocation entry: intent sanitising, caller trust (listener/system/foreign), cold vs warm delivery, lock state, deadlines, account/epoch replacement, focus/pause/destroy retiring a Power grant, Quick Settings tile unlock flow. Duplicates: on-device `android/app/src/androidTest/.../AssistantInstrumentedTest.java` covers launchSurface on a real WebView (different evidence level). Callers: `native/assistant-entry.mjs:12`, `native/assistant-entry-platform.mjs:125` (inserts the `beforeBridgeReentry` call into `MainActivity` text); test `test/quint-native-assistant-entry.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 55-61 + `assistant-entry-platform.mjs:125` | T10 | The hook `beforeBridgeReentry` is spliced into product source by text replacement of `'    onNewIntent(getIntent());'`. Reformatting `MainActivity` breaks the harness. | Port: observe the load-time intent through a port class the platform already stubs (e.g. `BridgeActivity` stub records `getIntent()` at `load`), removing the text edit. | Medium |
| 2 | 225-238 | A7 (owner question) | `readSurface` drives `AlphaLocalAgentPlugin.launchSurface`/`takeInvocation` and labels the reply "legacy". The renderer never calls `launchSurface` (`git grep launchSurface apps/app/src` empty; only `AssistantInstrumentedTest`), and invocations are taken through `Sense.takeInvocation` (`apps/app/src/runtime/always-on-listener.ts:56`). | If the two plugin methods are dead, delete them, their instrumentation assertions and the `readSurface` steps/`legacy` reply kind in the model. | Medium: confirm no upstream client calls `Agent.launchSurface`. |
| 3 | 364-367 | — | `legacy-caller` = pre-API-35 one-argument `onNewIntent`; that is OS compatibility, not legacy data. | Keep; rename scenario `one-arg-new-intent`. | None |
| 4 | 32-36, 63-74 | — | Reflection into `SenseListenerClient` private static maps (`invocations`, `powerLaunches`, `activityBridges`). Coupled to upstream private names. | Keep; list as upstream follow-up for a read-only snapshot accessor (D14). | Low |

## Proposed end state
Same scenarios minus `readSurface` if the legacy plugin surface is dead; no source-text hook in `MainActivity`.
Driver remains a real-class JVM integration for a planned feature.
