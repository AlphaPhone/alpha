# apps/app/src/runtime/always-on-listener.ts
- Lines: 77 | Role: renderer port to the AOSP image's `ElizaSense` wake listener: status/pause/turn-off, stop-on-start for chat-only voice, and (dormant) assistant-invocation start | Verdict: SIMPLIFY (owner decision on the dormant half)
- Importers: `main.tsx:73` (`installListenerInvocation`, `stopWakeListenerForChatOnly`), `prototype/settings-adapter.ts:36` (`listenerStatus`, `openListenerSettings`, `pauseListener`, `turnOffListener`, `wakeListeningStopUnconfirmed`). Android mirror: `AlphaAssistActivity.java:19,53` fires `"alpha:assist-invocation"`. Text/path pins: `test/voice-in-chat-only.test.mjs:35,41` regex-matches `if(!externalVoiceInvocationEnabled || !nativeListener())return` (T1); `specs/quint/application/manifest.json` symbol pin `listenerStatus`; `specs/quint/native/manifest.json`; feature-parity inventory.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 53-57 | A7 | `assistantInvocation(...)` — 0 references in apps, android, test, scripts, specs. | Delete. | None. |
| 2 | 59-60 | A7 | `export const MODAL = 'dialog[open], …'` — 0 references anywhere. | Delete. | None. |
| 3 | 47-51, 61-77, 27 | A4 | `externalVoiceInvocationEnabled = false` (voice-entry-policy.ts:2, P-78) makes `installListenerInvocation` and `openListenerSettings` return no-ops in every build, and short-circuits nothing in `stopWakeListenerForChatOnly` except the first operand. | Owner decision (PRD names always-on listening as an AOSP gate). If not planned now: delete `installListenerInvocation`, `INVOCATION_EVENT`, `openListenerSettings` (and the settings row at settings-adapter.ts:780), the `main.tsx` install, `voice-entry-policy.ts`, and `AlphaAssistActivity`'s JS event; ~35 lines here. If planned: record in DECISIONS.md and keep. | Medium (owner). |
| 4 | 7, 56 | D4 | `const listener = Sense` alias, yet L56 calls `Sense` directly. | Use `Sense` everywhere. | None. |
| 5 | 29-44 | C3 | Hand-rolled 5 s timeout race with `setTimeout`/`clearTimeout`. | `AbortSignal.timeout(5000)` + shared `raceAbort`. | Low. |
| 6 | 12, 50 | B1 (keep one) | `catch { return { available: false }; }` / `catch { return false; }` turn any native error into "unavailable". | Keep for `ask` (spec: web and non-image phones read unavailable); `openListenerSettings` goes with finding 3. | — |
| 7 | 63-70 | A8 | Comment cites "#423" and narrates history. | Two-line description. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `nativeListener` | helper | 9 | Capacitor availability checks across plugins | keep |
| `INVOCATION_EVENT` | const | 62 | `AlphaAssistActivity.INVOCATION_EVENT` (Java) | keep both or delete both (finding 3) |
| `MODAL` | const | 60 | modal selectors in modal-inert.ts / prototype | delete |

## Proposed end state
Without the dormant half: ~38 lines (`ask`, `listenerStatus`, `pauseListener`, `turnOffListener`, `stopWakeListenerForChatOnly` with a shared timeout race, `wakeListeningStopUnconfirmed`). With it kept: ~60 lines (findings 1, 2, 4, 5 only).

## Verification
`test/voice-in-chat-only.test.mjs` (update regex or delete as T1), settings voice specs, `specs/quint/native` listener models; Android emulator HOME-role run does not exercise ElizaSense — AOSP image acceptance needed for finding 3.
