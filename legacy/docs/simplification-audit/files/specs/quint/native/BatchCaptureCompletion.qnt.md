# specs/quint/native/BatchCaptureCompletion.qnt
- Lines: 87 | Kind: Quint model (live) | Verdict: KEEP model; PORT harness (slice → import)
- Covers: renderer ownership of one recorded conversation draft: early native stop callbacks held until acknowledgement, a phone-call stop never publishes, abort before/after acknowledgement cancels natively, the exact owner's finished draft is the one published, failed cleanup stays visible. Duplicates: none in `native/`; voice-turn behaviour overlaps `VoiceSession.qnt` only at the session level. Callers/importers: `quint:check` (4 runs); `specs/quint/refinement/native/batch-capture-completion.mjs` (15 scenarios), run from `refinement/native/index.mjs:192`; obligation `index.mjs:211`; prose `specs/quint/native/README.md`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness `batch-capture-completion.mjs:38-58` | T2 / T10 | The harness reads `apps/app/src/prototype/voice-adapter.ts` as text and cuts two fragments by literal markers: `const CALL_PAUSED = ` … `const deviceVoice = registerPlugin`, and `  async function captureConversationAudio(` … `  /** Holds a finished transcript`. It then injects an observer after the exact line `      const earlyStops=new Map<string,VoiceRecordingStopped>();`, strips types with `transformSync`, and evaluates it in `new Function('fixture', …)` with stubbed `setTimeout`, `clearTimeout`, `batchRecordingEnded`, `refresh` and free variables (`stopping`, `mediaUnconfirmed`, `startingCapture`, `recordingId`, `started`, `conversationLevels`, `clip`). Any reformat (D9 Prettier) or rename breaks it. Anchors are present today (voice-adapter.ts:55, 66, 481, 490, 518). | PORT: move `captureConversationAudio` and its constants out of the `voice-adapter.ts` closure into `apps/app/src/runtime/conversation-capture.ts` exporting `createConversationCapture({setTimeout, clearTimeout, batchRecordingEnded, refresh})` that returns `{capture, snapshot()}` (snapshot = the fields the harness observes: `active, recording, id, ended, problem, stopSeen, earlyStops, handle, cancelling, published, mediaUnconfirmed`). The harness bundles it with esbuild like `telephony.mjs` and drives the same 15 scenarios. | Medium: product refactor of a 2.1k-line adapter closure; must keep the free-variable sharing explicit. |
| 2 | manifest `sources` | T10 | `apps/app/src/runtime/cloud-voice.ts` is listed but only its type is used by the sliced code. | After the port, list the new module only. | Low |
| 3 | 66-70 | — | `step` enumerates fixed parameter combinations (e.g. `stopped(1,"recorded")`, `stopped(2,"microphone")`) rather than `nondet`; it bounds the space deliberately. | None. | — |
| 4 | 78-86 | — | Four runs use `.expect` (no `check` action), consistent with newer models. | None. | — |

## Proposed end state
Model unchanged. `captureConversationAudio` becomes an exported module with an explicit observation snapshot; the
harness imports it instead of slicing `voice-adapter.ts`, so the formatter and the `model.js`/adapter splits can
proceed. Same 15 scenarios, no `new Function`.
