# test/development-voice-navigation.test.mjs
- Lines: 109 | Kind: transplant (strips `runtime/development-cartesia-conversation.ts`, regex-replaces its gate and dynamic import, runs via `new Function` with 12 injected names) + a second transplant slicing `p.applyRealtimeVoiceNavigation` out of `prototype/agent-adapter.ts` by marker | Verdict: REWRITE: controller cases into `test/integration/voice.test.ts` (with `development-cartesia-conversation`), view-projection cases into `journeys/voice.spec.ts`
- Covers: realtime voice navigation fires once per finalized current turn, ignores unsolicited/duplicate/interrupted effects, Stop retires queued effects, camera continuation runs once and respects ask-first, and the agent-adapter projection admits only MVP views and exact paths. Duplicates: same module and same harness shape as `development-cartesia-conversation.test.mjs`; navigation dedupe also asserted there (line 76-90). Callers/importers: `npm test`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-14 | T2 | Regex replaces the exact gate expression (`import.meta.env.DEV===true&&devSurfacesEnabled&&...`); the gate now lives in `development-cartesia-flag.ts`, so the replace is a silent no-op and only works because the import lines are deleted. Shows how brittle the transplant is. | Real-module bundle (see sibling report). | Medium. |
| 2 | 38-51 | T2 | Slices `agent-adapter.ts` between two `p.` method markers and runs with fake `openInternalView`. | Delete; drive "Open notes" by voice in `journeys/voice.spec.ts` and assert Notes opens; refused targets (wallet, external URL, sub-path) as a table in the same journey. | Medium: the view-allowlist guard has no other test. |
| 3 | 17 | T5 | Re-implements upstream reducer ordering. | Use the real SDK client. | Low. |
| 4 | 25-36, 62-109 | - | Navigation once/dedupe, Stop retirement, owner replacement, camera continuation, malformed message ids, health refusal. | Carry 6 cases (navigation once incl. targeted renderer frame; Stop retires; owner change; camera continuation once + ask-first; malformed `userMessageId`; health refusal shared with sibling). | - |
| 5 | 67-74 | T4 | Automatic-mute case duplicates `development-cartesia-conversation` lines 124-132. | Drop. | None. |

## Proposed end state
File deleted. Six controller cases join the dev-Cartesia block of `test/integration/voice.test.ts`; the view projection is a
user-visible voice journey. Same owner question as the sibling: if dev Cartesia is retired, delete with the module.
