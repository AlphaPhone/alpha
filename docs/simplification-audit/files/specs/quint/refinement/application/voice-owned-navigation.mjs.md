# specs/quint/refinement/application/voice-owned-navigation.mjs
- Lines: 104 | Kind: Quint model-trace replay on a text slice of `prototype/voice-adapter.ts` (closure functions cut by anchors, recompiled with stub closure variables) | Verdict: PORT
- Covers: `VoiceOwnedNavigation` — when voice asks the shell to navigate, the claim is pinned on the destination; user navigation or an undelivered/unconfirmed navigation retires voice; a second claim is refused. Product: `apps/app/src/prototype/voice-adapter.ts` (`chatCurrent`, `navigationContinuation`, the `openView/goHome/back` wrappers). Duplicates: voice Playwright journey covers voice open/close, not these races. Callers: `test/quint-voice-owned-navigation.test.mjs` only (not in the aggregate).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 26-40 | T10 / T2 | Cuts `'  function chatCurrent(){'`→`'  function cancelChat('` and `"  for (const method of ['openView', 'goHome', 'back']) {"`→`'  async function captureConversationAudio('`, then re-creates the closure (`chatDestination`, `ownedNavigation`, `conversationPrepared`, `generation`, a hand-written `cleanup`). The harness reimplements `cleanup`, so it does not test the real one. | Extract voice-owned navigation into a module (`prototype/voice-navigation.ts`) exporting a factory with explicit state and `cleanup`; import it here. Part of the stage F voice-adapter split. | M |
| 2 | 15 | C5 | Uses `assistant-model-traces.mjs`, one of three ITF runners. | Merged runner. | L |
| 3 | 85 | B1 | `catch {}` in `contextPinned` hides a wrong pin. | Assert the expected refusal explicitly. | L |

Product file read as text: `apps/app/src/prototype/voice-adapter.ts` (anchors listed above).

## Proposed end state
Imports the extracted navigation-claim module; same scenarios/witnesses; shared trace runner.
