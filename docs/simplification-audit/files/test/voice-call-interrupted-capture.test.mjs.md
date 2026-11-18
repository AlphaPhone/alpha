# test/voice-call-interrupted-capture.test.mjs
- Lines: 51 | Kind: transplant (`test/fixtures/cloud-voice-view.mjs`: type-stripped `voice-adapter.ts` and friends evaluated in `vm` with in-memory ports; `voiceFakeClock` from `shared-batch-voice.mjs`) | Verdict: DELETE (REWRITE two cases into `journeys/voice.spec.ts`)
- Covers: a capture ended by a phone call is discarded, not transcribed or sent, and shows "Voice paused for a phone call."; a call before the start acknowledgement retires only the matching recording; a workflow-run reply is spoken and shown without its `[WORKFLOW]` block. Duplicates: `voice-calm-cloud-errors.test.mjs:139-149, 251-272` (same call message through the same fixture). No Playwright spec asserts the call message or `[WORKFLOW]` stripping in voice (grep of `test/browser` for `call-active`/`Voice paused` finds nothing). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-4, 9-10 | T2 | Runs a vm-transplanted copy of the voice views with stubbed `React`/`VoiceActivity`. | Delete. | Low |
| 2 | 8-21 | gap | Call interruption copy and "nothing sent" is a real product rule with no journey coverage. | Carry: native voice fixture emits `recordingStopped` with `interrupted:'call-active'`; assert the voice panel text and that no `/api` send happened. | Medium |
| 3 | 23-37 | T3 | Race of call vs start acknowledgement: internal ordering detail. | Drop. | Low |
| 4 | 39-51 | gap | `[WORKFLOW]` markup never spoken or shown in voice. | Carry: reply fixture containing a malformed `[WORKFLOW]` block; assert panel text and synthesized text omit it. | Medium |

## Proposed end state
File deleted. `journeys/voice.spec.ts` gains "a phone call pauses voice and sends nothing" and "workflow markup is
neither spoken nor shown", using the shared Capacitor voice fixture (`test/browser/voice-fixture.ts`).
