# specs/quint/application/RecorderStage.qnt
- Lines: 92 | Kind: Quint model, live (in `application/manifest.json`, run by `quint:check`) | Verdict: KEEP
- Covers: Voice-surface recorder stages over the native live-dictation driver: generation-fenced tasks, failed stop releases the driver, max-duration stop, apply sends nothing. Duplicates: none (VoiceSurfaceRetirement covers the outer chain, not this stage machine). Callers/importers: manifest only: 9 symbol pins, incl. generic words `generation`, `cleanup`, `reopen` in `prototype/voice-adapter.ts`; `sharedSources` `packages/voice/src/{live-voice-session,native-live-voice}.ts`; README row line 57.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | manifest | T10 | Symbol pins `generation`, `cleanup`, `reopen`, `maxDurationMs` are generic words: the word-bounded regex in `quint-lib.ts` will match almost any revision, so the pin proves nothing. | Drop symbol pins; keep `sources` + `sharedSources` file pins. | L |
| 2 | 1-3 | - | No executable link to `voice-adapter.ts` or `native-live-voice.ts`. | Optional PORT later: bundle `runtime/native-live-voice.ts` (`createNativeLiveDictation` is exported) with a fake plugin and drive the stage actions. | M |

## Proposed end state
- Keep; live code (`voice-adapter.ts`, `native-live-voice.ts`).
- Manifest symbol pins removed with the T10 sweep.
- Backstop: `journeys/voice.spec.ts` (record, transcribe, apply into composer; stop failure then retry).
