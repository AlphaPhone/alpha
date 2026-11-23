# test/browser/dev-workflow-speech.spec.ts
- Lines: 31 (10.5 KB) | Kind: Playwright, chromium; simulator Speak step with Cloud speech and agent speech fixtures, pickup waits | Verdict: DELETE
- Covers: simulator waits for real speech completion, stops on cancel/error/retire, replacement speech fails the old run, pending Cloud synthesis cancels, 20-minute timeout, pickup release once / after cancel / while backgrounded / after edit / after reload / while locked. Duplicates: `dev-workflow-automatic-speech.spec.ts` (same rules on automatic runs). Callers: chromium only. Helpers: `voice-fixture.ts`, `generic-cloud-speech-fixture.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-7 | P7 | Dev-only executor seeded through `alpha.dev.app.workflows`. | Delete with the simulator. | Low. |
| 2 | 17 | T8 | `page.clock.install()` + `fastForward(20*60*1000+1)` mixed with fixed time elsewhere. | Gone. | None. |
| 3 | 18, 23 | D2, P3 | `Component.prototype.api` capture to edit the workflow mid-wait. | Gone. | None. |
| 4 | 22 | P2 | Backgrounding faked with `document.documentElement.dataset.devBackground='true'` and a synthetic `alpha:dev-pickup` event. | Gone. | None. |
| 5 | 13 | T6 | Replacement speech started via `registerPlugin('AlphaVoiceCloud')` in-page. | Gone. | None. |

## Proposed end state
Deleted with the simulator. Speech-ownership rules for product speech remain in `journeys/voice.spec.ts`.
