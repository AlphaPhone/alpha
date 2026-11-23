# test/browser/listener-invocation.production.spec.ts
- Lines: 121 | Kind: Playwright journey, `production` (flag-off bundle + `flag-off-android.ts`), 8 tests (5 from a loop); bridge stubs for ElizaSense, AlphaVoiceCloud, DailyApps, live ASR route | Verdict: KEEP (P-78 section of `journeys/voice.spec.ts`), loop collapsed
- Covers: while always-on listening and hardware invocation are deferred (D7), listener wake / power press / assist entry cannot start voice or claim an invocation, startup turns a running image listener off, Settings shows no deferred controls, an unconfirmed stop keeps a "Mic may be on" notice, and in-chat Talk still starts local voice. Duplicates: Talk start/stop is also in the voice conversation specs (`voice-assistant*`). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 74-89 | T4 | Five loop variants differ only in what the stub's `takeInvocation` would return, but the assertion is that the renderer never calls it; the five runs exercise one code path. | Keep one test (locked listener wake) that also dispatches `alpha:assist-invocation` and `visibilitychange`. | Low: if the product later starts claiming invocations the variants come back with the feature (D7). |
| 2 | 85 | T8 | `waitForTimeout(500)` negative wait. | One named quiet-wait helper. | Low. |
| 3 | 27-41 | B3 (test) | Stub re-validates binding inputs with hand-written checks for calls the test asserts never happen. | Reduce to recording the call. | Low. |
| 4 | 10-62 | T7 | 50-line bridge patch for ElizaSense/AlphaVoiceCloud overlaps `voice-assistant-fixture.ts`. | Use the shared voice bridge fixture from the harness. | Low. |
| 5 | 91-100 | T4 | "Talk still starts local voice" overlaps voice journey Talk start/stop. | Keep as a step after the deferred entry in the single test. | Low. |

## Proposed end state
`journeys/voice.spec.ts` (production project) "deferred invocations" test: deferred hardware entry does nothing, Talk still starts and stops local voice; plus "startup turns the listener off and Settings hides deferred controls" and "unconfirmed stop keeps the notice". Three tests instead of eight, on the shared voice bridge fixture.
