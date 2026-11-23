# specs/quint/refinement/native/note-bridge-platform.mjs
- Lines: 160 | Kind: stub set layered on `note-recording-platform.mjs` (no product text read; rewrites sibling stub text) | Verdict: KEEP; SIMPLIFY (assert or remove the text rewrites; drop stubs of deleted classes)
- Covers: Lets the whole `AlphaVoiceCloudPlugin` compile for its Notes entry points: Capacitor permission plumbing, a controlled `LocalSpeechBridgePlugin` parent, fenced speech transports, credential and pairing classes that throw if touched. Duplicates: stub classes overlap `resident-platform.mjs`, `live-capture-platform.mjs`, `shared-recording-platform.mjs`. Callers/importers: `native/note-bridge.mjs:7`, `native/shared-recording-platform.mjs`, `native/voice-draft.mjs` (`git grep noteBridgePlatform`); hashed by `piped-capture.mjs:13`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-11 | correctness/T10 | Rewrites three stubs from `note-recording-platform.mjs` with `String.replace` and no check. If the base stub text changes, the rewrite silently does nothing and NoteBridge ports are never wired (Handler posts go to the wrong port class). | Make the base stubs call one configurable port (e.g. a static `Ports.post` hook) instead of rewriting text; at minimum assert the anchor matched. | Medium |
| 2 | 70-102 | — | `LocalSpeechBridgePlugin` is a hand-written stand-in for the upstream parent; the receipt states this is conditional. Acceptable port. | Keep; note in assumptions as now. | — |
| 3 | 144-154 | A3/D5 | Stubs `PairedAgentCredential` and `PairedSpeechContract`, which delete-candidates A69 / C4 delete with hosted pairing. | Remove these stubs in the same change that deletes the product classes (the compile will tell). | Low |
| 4 | 31-69 | C5 | Capacitor `PluginCall`/`Plugin`/annotations and Android `Activity`, `Manifest` duplicated across platforms. | Shared stub library. | Low |

## Proposed end state
Note-bridge-specific stubs only, no text rewrites of other stub files, no stubs for deleted pairing classes.
