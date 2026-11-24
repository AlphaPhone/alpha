# specs/quint/application/VoiceOwnedNavigation.qnt
- Lines: 96 | Kind: Quint model (live: manifest, 6 scenarios, 7 invariants, 4 witnesses, 8 symbol pins on `voice-adapter.ts`) | Verdict: KEEP; PORT harness
- Covers: an agent-requested screen change during voice keeps voice only when the shell's own navigation lands on the claimed destination with the pinned context; any other navigation retires voice. Duplicates: none. Callers/importers: manifest; harness `refinement/application/voice-owned-navigation.mjs` (104); `test/quint-voice-owned-navigation.test.mjs` (14). Not in the aggregate index.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness 25-37 | T2 / T10 | `compile()` slices `apps/app/src/prototype/voice-adapter.ts` between `'  function chatCurrent(){'`/`'  function cancelChat('` and `"  for (const method of ['openView', 'goHome', 'back']) {"`/`'  async function captureConversationAudio('`, then wraps the fragments in hand-written stubs (`cleanup`, `cancelChat`, `dismissRetirement`, `noteRealtimeCancellation`) and transpiles with esbuild. Exact-indentation anchors break on Prettier. | PORT: extract the owned-navigation state (`navigationContinuation`, `chatCurrent`, the navigation wrappers) from `voice-adapter.ts` into an importable factory, e.g. `prototype/voice/owned-navigation.ts` exporting `createOwnedNavigation({shell, retire})`; the harness imports it. | Medium (needs a product extraction) |
| 2 | 69 | B4 | `CountersBounded` includes `s.retiredUnconfirmed >= 0`, always true; the other two bounds are enforced by guards. | Drop `CountersBounded` from `safety` (or the trivially true conjunct); remove from manifest `invariants`. | Low |
| 3 | manifest | T10 | 8 symbol pins incl. string literals `owned-navigation-unconfirmed`, `shell-navigation-unowned`. | Pin the file. | Low |

## Proposed end state
Model minus a trivially true invariant. Harness imports an extracted owned-navigation module rather than slicing `voice-adapter.ts`. One runner.
