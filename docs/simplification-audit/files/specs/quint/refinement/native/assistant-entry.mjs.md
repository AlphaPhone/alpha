# specs/quint/refinement/native/assistant-entry.mjs
- Lines: 78 | Kind: Quint refinement driver (Node; runs `AssistantEntryTraces.java` for 35 cases) plus source-text assertions on Capacitor `BridgeActivity.java` | Verdict: KEEP; SIMPLIFY
- Covers: model `NativeAssistantEntry` (live, D7: assistant/Power invocation is a planned PRD gate): cold/warm assistant launch, exact deadlines, locked device, copied intents during load, Power entry accept/deny reasons, SDK 33/34 caller paths, Quick Settings tile on 33/34/36. Duplicates: `test/quint-native-assistant-entry.test.mjs` (T4). Callers: `index.mjs:61`, that test.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 56-59 | T1 | Regex assertions over `node_modules/@capacitor/android/.../BridgeActivity.java` (bridge created before `onNewIntent(getIntent())`) to justify the stubbed `BridgeActivity`. A source-text check on a third-party dependency. | Keep only as a pin: hash `BridgeActivity.java` against the locked `@capacitor/android` version (it is already in `sources`), and drop the regexes; or delete if the lockfile pin suffices. | Low |
| 2 | 46-55 | B5 | consumer-host deep-equal and lock re-hash block (same as other native drivers). | Shared helper. | Low |
| 3 | 27 | — | Case name `legacy-caller` means SDK 33/34 callers without `ComponentCaller`, not legacy data; not A1. | Rename to `pre35-caller` for clarity (model label too). | Low |

## Proposed end state
Case table, shared pin check, campaign, `checkTraces`; no regexes on Capacitor source. Run from the native aggregate only.
