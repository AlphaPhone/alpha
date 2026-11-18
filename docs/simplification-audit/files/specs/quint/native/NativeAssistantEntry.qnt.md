# specs/quint/native/NativeAssistantEntry.qnt
- Lines: 221 | Kind: Quint model (live, `native` manifest; JVM refinement harness with text slices) | Verdict: KEEP (D7); delete the dead "legacy" readback part; PORT the `AlphaLocalAgentPlugin` slice
- Covers: assistant/Power Activity entry: sanitised intent surfaces, exact one-use Power grant, monotone bridge binding, cold-start Sense attribution, Quick Settings tile with no authority. Duplicates: `test/power-sense-entry.test.mjs` and `AssistantInstrumentedTest` (A54, cannot pass: activity disabled) cover overlapping entry behaviour. Callers/importers: `native/manifest.json` (9 tests, 5 invariants), harness `refinement/native/assistant-entry.mjs` + `assistant-entry-platform.mjs` + `main-activity-platform.mjs` + `AssistantEntryTraces.java`; `test/quint-native-assistant-entry.test.mjs`; native aggregate; README `:742`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 110-113, 164, 178, 201 | A7 | `readSurface` + invariant `legacyHasNoVoice` model the bridge methods `AlphaLocalAgentPlugin.launchSurface`/`takeInvocation` (`AlphaLocalAgentPlugin.java:332,340`). `git grep` finds no renderer caller: `apps/app/src` only uses `Sense.takeInvocation` (`runtime/always-on-listener.ts:56`); the only callers are this harness (`AssistantEntryTraces.java:229-230`) and `AssistantInstrumentedTest` (A54). B20 already lists `AlphaAssistActivity.takeInvocation` as dead. | Delete `readSurface`, `legacyHasNoVoice`, the `readSurface` step in `modernWarmListenerReadOnceTest`, the harness case, and (android chunk) the two PluginMethods and `AlphaAssistActivity.takeInvocation`. | M: coordinate with the android owner and A54 |
| 2 | harness | T10 | `assistant-entry-platform.mjs:165-166` slices `AlphaLocalAgentPlugin.java` between `' static final class PowerLaunchPin'`…`' private final java.util.Set<String> cancelledStarts'` and `' @PluginMethod public void launchSurface('`…`' /** Read-only: may this surface'`; regex on `AlphaNavigationService.java` for `ACTION_SHOW_MAPS`; regex asserts on Capacitor `BridgeActivity.java` (`assistant-entry.mjs:56-59`). Anchors present after stage A. | PORT: move `PowerLaunchPin` to its own package-private file (it is already a static nested class) and compile it whole; with finding 1 the `launchSurface` slice disappears. Read `ACTION_SHOW_MAPS` by compiling `AlphaNavigationService` or move the constant to a small constants class. Keep the Capacitor check (third-party pin) or move it to the APK audit. | M: `AlphaLocalAgentPlugin` is a D1 split target, so the slice will break anyway |
| 3 | 1-221 | D7 (kept) | Models activities that ship `enabled=false` (A70). D7/R7 keep them. | None now; if the owner later deletes P-78 entries, delete this model with them. | - |
| 4 | test wrapper | T4, B5 | Run twice; wrapper pins `traces 35`, `observedFields 14`. | One runner; `> 0`. | L |

## Proposed end state
Model without the legacy readback (four invariants). Harness compiles `PowerLaunchPin` and the activities whole and no
longer slices `AlphaLocalAgentPlugin.java`. Remains tied to D7; deleted together with the entry points if the owner
ever retires them.
