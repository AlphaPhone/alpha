# specs/quint/application/VoiceTurnReview.qnt
- Lines: 95 | Kind: Quint model (live: manifest, 7 scenarios, 8 invariants, 4 witnesses, 7 symbol pins on `voice-adapter.ts`) | Verdict: KEEP
- Covers: a finished voice transcript is held for review, sent only by Send (possibly edited, never empty), settles once; Discard ends voice; a reply needing a phone-action review stops listening for that request. Duplicates: none found — `reviewConversationTurn` and `conversationReviewRequired` appear in no test or harness. Callers/importers: manifest only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | manifest | T10 | Only tie: 7 symbol pins including the UI string `Voice message discarded`. Nothing executes the implementation against this model, and no other test references the two main functions. | Pin the file. Add implementation coverage: `journeys/voice.spec.ts` case "review a transcript, edit, send; discard ends voice" (needs the voice test harness that drives a fake STT final). | Medium (coverage gap) |
| 2 | 64 | — | `SendsNeedReviews` (`sends <= 3 * restarts`) is a weak bound, but `start`/`recover` reset `settles` per restart, so it is the cross-restart form of "one send per review". Fine. | None. | — |

## Proposed end state
Model unchanged; file pins instead of symbol pins. The behaviour has no executable coverage today; the voice journey must carry a reviewed-turn case (listed in the chunk summary).
