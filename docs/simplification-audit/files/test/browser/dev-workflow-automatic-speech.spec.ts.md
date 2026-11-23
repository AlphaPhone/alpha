# test/browser/dev-workflow-automatic-speech.spec.ts
- Lines: 21 (9.7 KB) | Kind: Playwright, chromium; local workflow simulator, time trigger + Speak step, fake clock | Verdict: DELETE
- Covers: a scheduled simulator run speaks from Home, waits for the terminal speech event, waits for pickup, waits behind existing speech, survives cancel/replacement/lock/reload. Duplicates: `dev-workflow-speech.spec.ts` (same speech/pickup rules on manual runs). Callers: chromium only. Helpers: `voice-fixture.ts`, `generic-cloud-speech-fixture.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8 | P7 | Seeds `alpha.dev.app.workflows`; the executor, trigger scheduler and pickup wait are dev-only (`simulated-workflows.ts`, `workflow-trigger-runtime.ts`). | Delete with the simulator (Q-DEV-1). | Low for product. |
| 2 | 8-9 | T8 | `page.clock.setFixedTime` plus one `waitForTimeout(300)` (line 14). | Gone. | None. |
| 3 | 19 | D2, P3 | `Component.prototype.api` capture copy. | Gone. | None. |
| 4 | 14-16 | T6 | Competing speech started via `registerPlugin('AlphaVoiceCloud')` in-page. | Gone. | None. |
| 5 | — | T4 | 9 tests overlap 13 in `dev-workflow-speech.spec.ts` (pickup once, locked pickup, reload interrupt, replacement). | — | — |

## Proposed end state
Deleted with the local workflow simulator and its trigger runtime.
