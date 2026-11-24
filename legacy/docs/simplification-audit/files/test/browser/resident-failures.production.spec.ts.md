# test/browser/resident-failures.production.spec.ts
- Lines: 283 | Kind: Playwright, `production` project, real UI over `flag-off-android.ts` + `resident-stub.ts` with network fenced; 15 tests (4 kinds × 2 frames, 2 no-plan frames, offline, reject/busy, drop, hold, expired session) | Verdict: **MERGE** into `journeys/chat.spec.ts` (production project, "resident reply failures")
- Covers: a failed resident reply names its reason once (Billing declined, Reply failed, AI offline), hides provider prose, offers only the right next step (Subscription panel with plan and code entry, Check Eliza Cloud again) and never resends; without a plan the agent answers honestly with Choose plan; offline sends are silently refused with the draft kept and send once back online; IPC refusal and HTTP 429 keep the text and a second Send posts once; a stream dropped after recording re-reads once with the same `clientMessageId` and survives restart without duplication; a restart during a held reply shows turn and reply once; an expired session reconnects without touching the Cloud key and retains the draft for explicit restore. Duplicates: no-plan notice overlaps `production-surface.spec.ts` P-43 matrix (`empty`/`unavailable`); Subscription panel overlaps `native-cloud-subscription.spec.ts`; restart behaviour overlaps `journey-core-loops.production.spec.ts` loop A. Callers/importers: imports `flag-off-android`, `resident-stub`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 110, 229 | T8 | `waitForTimeout(1500)` to prove "no automatic resend". | Wait for the terminal state, then assert stream count; or advance a fake clock past the retry window. | Low |
| 2 | 53 | T7 | `frame` (`done` vs `error`) doubles each kind; the UI path after parsing is the same. | Run both frames for one kind, one frame for the rest. | Low |
| 3 | 65-97 | D9 | The `insufficient_credits` branch is a 30-line sub-journey with two viewport screenshots. | Split into its own test ("billing refusal opens Subscription once"); drop screenshots or attach on failure. | none |
| 4 | 55, 127, 158, 198, 219, 240, 261 | T8 | 120-150 s timeouts on every test. | Default timeout after the sleeps go; keep a longer one only for the two restart tests. | Low |
| 5 | 18-20 | A8 | `NOT_SENT` constant exists only to assert a retired message never appears. | Keep the assertion (it guards an owner rule, 2026-11-03), drop the "retired" history wording. | none |
| 6 | 31-42 | T6-lite | `sendRefused` wraps `nativePromise` to observe draft `sending` marks in the secure slot. It observes the native boundary, which is acceptable. | Move to the shared agent fixture as a recorder. | none |

## Proposed end state
A production "resident reply failures" describe in `journeys/chat.spec.ts`, ~200 lines, no fixed sleeps: failure kinds (one frame
each, plus one both-frames case), billing refusal, no-plan answer, offline, refused/429, dropped stream + restart, held reply +
restart, expired session.
