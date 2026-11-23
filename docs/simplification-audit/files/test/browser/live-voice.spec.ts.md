# test/browser/live-voice.spec.ts
- Lines: 115 | Kind: Playwright module-in-page test, `chromium`, 2 tests; no product UI. Test 1 imports `/src/runtime/live-voice.ts` (a 34-line re-export of upstream `@elizaos/voice/live-session`); test 2 imports `.eliza/client-features/packages/voice/src/native-live-voice.ts` and `live-voice-session.ts` directly by `/@fs` path (T5, T6) | Verdict: DELETE
- Covers: upstream live-voice session: partials update interim text, stale turns and other sessions ignored, one final, owner change fences a native capture. Duplicates: `test/live-voice.test.mjs`, `test/native-live-start-cancellation.test.mjs` (host tests of the same modules). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-63 | T5, T6 | Tests upstream code through Alpha's pass-through re-export (`live-voice.ts:9-20`, D4) with a `<p>` element the test creates; nothing of Alpha's UI runs. | Delete; list as an upstream follow-up (D14) for `@elizaos/voice` tests. | Medium: Alpha keeps no direct check that interim text is shown during a live turn. |
| 2 | 72-73 | T5, D13 | Imports generated upstream output by file path. | Gone. | - |
| 3 | 45, 104 | T8 | `waitForTimeout(100)` negative waits. | Gone. | - |

## Proposed end state
File deleted. `journeys/voice.spec.ts` asserts interim text through the real Voice conversation region with the live-ASR bridge stub (partials then final) as one step; protocol-level cases go upstream.
