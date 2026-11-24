# test/local-reply-speech.test.mjs
- Lines: 68 | Kind: transplant (type-strips `runtime/local-reply-speech.ts`, deletes its imports by regex, runs in `vm` with a fake bridge and fake `crypto.randomUUID`) | Verdict: REWRITE as cases in `test/integration/voice.test.ts` over the real module
- Covers: open-microphone reply speech: the next sentence appends to the playing utterance and each call settles when its own sentence ends; interruption stops and rejects all in-flight sentences; a refused stop reports `speech-cleanup-unconfirmed`; a phone call ends with `call-active`; ending a conversation removes all bridge listeners and refuses later speech; a partial listener-setup failure removes opened listeners. Duplicates: none in the Quint manifests (`local-reply-speech.ts` is not listed); cleanup-unconfirmed semantics are shared with `speech-cleanup-latch.mjs`. Callers/importers: `npm test` glob. Product caller: `prototype/voice-adapter.ts:775`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7, 22 | T2 | Text transplant although `createLocalReplySpeaker(bridge = registerPlugin(...))` already takes the bridge as a parameter: the module can be imported (via `loadBrowserModule`) and given the fake bridge directly. | Import the real module; pass the fake bridge. | Low |
| 2 | 25-68 | — | Six behaviours with no other coverage; the append/settle ordering and listener retirement are the risky parts. | Carry: append + per-sentence settle, interrupt rejects all, refused stop → unconfirmed, call-active, retire removes listeners and refuses late speech. Drop "silence resolves without the bridge" + hold/release (trivial). | Medium |
| 3 | 8 | T8 | `tick` is a real 5 ms `setTimeout`. | Use microtask flushing. | Low |

## Proposed end state
File deleted; a "reply speech" block in `test/integration/voice.test.ts` imports `createLocalReplySpeaker` and drives it
with one typed fake of the `AlphaVoiceCloud` bridge (shared with the other voice cases; C2 one plugin interface).
