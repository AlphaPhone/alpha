# test/quint-connection-controller.test.mjs
- Lines: 95 | Kind: Quint replay with source transplant (slices six regions of `runtime/connection-ui.tsx` by literal markers, strips types, runs in `vm` with ~30 hand-written globals) | Verdict: PORT and MOVE (to `specs/quint/refinement/application/connection-controller.mjs`, registered in the runner)
- Covers: the connection step slot (`work()`, provider-key manager, queued sign-in return and notice, resident rebind queue, startup settlement) follows ConnectionController scenarios, witnesses and 80 random walks. Duplicates: `cloud-sign-in-*` host tests and `quint-signin-refinement` slice the same file for overlapping sign-in-return behaviour (tests-host research, cloud sign-in five). Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 18-35 | T2, T10 | Markers: `function retire(name?: string) {`, `let residentRebindQueue: ResidentRebindQueue | null = null;`, `/**`, `async function work(message: string`, `/** Only an explicitly failed native start`, `async function manageProviderKey(action:'reveal'`, `/** P-43: a startup path`, `function queueResidentRebind(`, `/** A native sign-in return that arrived while`, `async function remoteIdentity(`, `    if (operation) { queuedSignInReturn = value; return; }`, `    if (outcome.status ===`, `  signInIncomplete(value: unknown) {`, `  /**\n   * The Cloud sign-in hand-off`. | PORT: export a `createConnectionStepSlot(ports)` (work, manageProviderKey, queueResidentRebind, signInReturned, signInIncomplete, startup settle) from the `connection-ui` split and import it. | High |
| 2 | 29 | A3 interaction | End marker `async function remoteIdentity(` is deleted by C4 (hosted/paired paths). The slice fails the moment C4 lands. | Port before or with C4. | High |
| 3 | 21-23 | T1 | Regex assertions on source text: `\n  epoch\+\+;` inside `retire` and the exact `.finally(()=>{update({startupResolved:true…});runQueuedSignInReturn();})` string. Prettier (D9) breaks both. | Delete; the replay observes the behaviour. | High |
| 4 | 44-60 | C1, D3 | 30 injected globals reproduce module state (`operation`, `epoch`, `state`, `cloud`…): evidence that the module needs a typed port object. | Use the ports of the exported factory. | Medium |
| 5 | 91-93 | T5 | Projection-mutation canary (`undrained`) proves the harness can fail; tests the harness. | Delete. | None |
| 6 | 14-16 | C3 | Parses scenario/witness names from `.qnt` with regex; `modelNames()` in `maps-model-traces.mjs` does the same. | Use one shared `modelNames`. | Low |

## Proposed end state
A driver in `specs/quint/refinement/application/` imports the exported connection step-slot factory, builds it with held ports and replays ConnectionController traces; registered in the application index. No source-text regex, no `vm`.
