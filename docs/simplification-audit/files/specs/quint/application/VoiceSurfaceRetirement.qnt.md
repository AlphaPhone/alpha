# specs/quint/application/VoiceSurfaceRetirement.qnt
- Lines: 126 | Kind: Quint model (live: manifest, 10 scenarios, 8 invariants, 5 witnesses, 10 symbol pins on `voice-adapter.ts`) | Verdict: KEEP
- Covers: leaving the voice surface stops capture/conversation/speech on one chain; the chat holds a retirement until it settles; typed sends wait (or go out despite an unconfirmed stop); voice stays closed after an unconfirmed stop. Duplicates: implementation touched by host tests `test/voice-owned-capture-cleanup.test.mjs`, `test/composer-send-ownership.test.mjs`, `test/voice-denied-recovery.test.mjs` and `refinement/application/composer-send.mjs` (`stopVoiceConversation`); none replays this model. Callers/importers: manifest; `application/README.md`. No harness.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | manifest | T10 | Only tie: 10 symbol pins (`retirement`, `mediaUnconfirmed`, `stopVoiceConversation`, `dismissRetirement`, `MEDIA_UNCONFIRMED_NOTICE`, …). `MEDIA_UNCONFIRMED_NOTICE` has no test reference anywhere. | Pin the file; drop symbol pins. | Low |
| 2 | 8, 71 | — | `everUnconfirmed` exists only to state `UnconfirmedIsKept` (monotonic flag); fine. | None. | — |

## Proposed end state
Model unchanged. No refinement link exists; when `voice-adapter.ts` is split (Stage F), add a replay against the extracted retirement chain or rely on `journeys/voice.spec.ts` (type while voice is stopping; failed stop keeps voice closed). Record as a coverage gap until then.
