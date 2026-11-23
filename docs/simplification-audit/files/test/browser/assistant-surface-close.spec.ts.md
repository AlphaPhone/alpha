# test/browser/assistant-surface-close.spec.ts
- Lines: 67 | Kind: Playwright spec, chromium, 4 tests; reaches the shell through the React fiber and replaces its methods | Verdict: REWRITE as steps in `journeys/home-shell.spec.ts`
- Covers: on the ACTION_ASSIST surface (`?surface=assistant`) Go Home, closing and dragging the conversation down close the window; on Home, Back closes the drawer, then stops voice, then lowers the conversation. Duplicates: Android `AssistantInstrumentedTest` (finish), `home-assistant-surface.spec.ts` and `home-native-launcher.spec.ts:303-324` (assistant surface entry), back-order checks in launcher specs. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-16 | P3/T6 | `onShell` walks `__reactFiber$` to the shell instance and evaluates code strings with `new Function`; `closeAssistant` is replaced to count calls. | Observe the close at the bridge: the surface's close calls a native method (e.g. `DailyApps`/`ElizaSystem` finish); record it in the fake bridge. | Medium: needs the close path to cross the bridge in the flag-off build. |
| 2 | 32 | T6 | Test 2 calls `shell.renderVals().closeChat()` instead of a control. | Use the visible Close/Minimize control. | Low. |
| 3 | 57-66 | T6 | Back-order test sets `drawer/chat/voice` state with `shell.setState` and calls `shell.back()`. | Open the drawer and conversation through UI, start voice via the voice fixture, press Back (`alpha-back` event as the Android back boundary), assert visible state. | Medium. |

## Proposed end state
File deleted. `journeys/home-shell.spec.ts` gets "assistant surface: Go Home / close / drag-down each finish the surface (bridge call recorded)" and "Back order: drawer → voice → conversation", both through visible controls and the Back boundary event. No fiber access.
