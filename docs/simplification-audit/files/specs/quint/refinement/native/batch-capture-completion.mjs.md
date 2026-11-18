# specs/quint/refinement/native/batch-capture-completion.mjs
- Lines: 158 | Kind: Quint refinement driver (Node; slices `captureConversationAudio` out of `apps/app/src/prototype/voice-adapter.ts`, injects an observer line, transpiles with esbuild and runs it with fake Capacitor/timer ports) | Verdict: PORT (and MOVE to the application family)
- Covers: model `BatchCaptureCompletion` (live): renderer batch voice capture. Early native stop events before the start acknowledgement, wrong-owner stop, call interruption, metrics failure, abort before/after ack, cancel cleanup failure, rejected start, duplicate terminal events. 15 scenarios. Duplicates: `test/quint-batch-capture-completion.test.mjs` re-runs it (T4); Playwright voice specs cover the happy path only. Callers: `index.mjs:38`, that test.

## Text anchors (T10)
- `voice-adapter.ts`: header `'const CALL_PAUSED = '` .. `'const deviceVoice = registerPlugin'`; body `'  async function captureConversationAudio('` .. `'  /** Holds a finished transcript'`; injection seam `'      const earlyStops=new Map<string,VoiceRecordingStopped>();'` (all present today).
- The `new Function` wrapper pre-declares `stopping, mediaUnconfirmed, startingCapture, recordingId, started, conversationLevels, clip` and pulls `setTimeout, clearTimeout, batchRecordingEnded, refresh` from the fixture: closure variables of the surrounding adapter that the slice depends on.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 38-58 | T10 / T2 | A transplant: the function runs outside its module with re-declared closure state and an injected observer. Any rename of those seven locals, the comment anchor or the seam breaks it. | Extract `createConversationCapture({port, timers, onEnded, refresh})` into `apps/app/src/runtime/conversation-capture.ts` (or `voice/`), returning the capture with a read-only `snapshot()`; `tsImport` it here. | Medium: voice-adapter is a D2 adapter being reshaped anyway. |
| 2 | — | D11 | Renderer TypeScript model filed under the native family (`refinement/native`, `index.mjs:38`). | Move driver and registration to `refinement/application`. | Low |
| 3 | 17-26 | T10 (message text) | Failure classes are inferred from error message strings (`'Microphone capture was interrupted.'`, `'Recording identity changed.'`). | Use error `code`s exported by the extracted module. | Low |
| 4 | 148 | B5 | `sources` lists `cloud-voice.ts` and `package-lock.json` for the receipt though neither is executed. | Derive sources from the import graph once the module is imported. | Low |

## Proposed end state
Imports the real capture factory from an exported module, injects ports by parameter, observes via `snapshot()`; lives in the application family; about 110 lines.
