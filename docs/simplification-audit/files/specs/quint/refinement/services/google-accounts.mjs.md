# specs/quint/refinement/services/google-accounts.mjs
- Lines: 57 | Kind: Quint refinement harness (esbuild-bundles real `google-accounts.ts` and `google-workspace-return.ts`) | Verdict: MERGE into `google-accounts-lifecycle.mjs`
- Covers: connect → Workspace return → account readback → disconnect with four readback outcomes, for model `GoogleAccounts`. Duplicates: `google-accounts-lifecycle.mjs` lines 26-44 run the same four disconnect outcomes against the same model with the same client fake. Callers: `services/index.mjs` only; no per-model test (grep).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 21-50 | T4 / C5 | Four-outcome disconnect loop is a near copy of the lifecycle harness's first loop; both emit a `GoogleAccounts` receipt. | Carry over only the part the lifecycle file lacks: the `connect` step (held `initiateGoogle`) followed by a matched Workspace return (`watchGoogleWorkspaceReturn` with `consume → connected`) and `readback` asserting both Gmail and Calendar grants. Delete the rest. | Low |
| 2 | 15-17 | — (stale stub) | Stub `retireGmailBackground=async()=>{}` does not match the real API (`gmail-background.ts:11` returns an object with `.settled()`; used at `google-accounts.ts:310,318`). The lifecycle harness stubs it correctly. The disconnect path tolerates the failure, so the trace passes while exercising a broken port. | Gone with the merge. | Low |
| 3 | 4-13 | C5 | Its own `sources` + `capture` closure duplicated verbatim in the lifecycle file. | Gone with the merge. | Low |
| 4 | 21-22 | B2 | Saves/restores `globalThis.window = new EventTarget()`; the lifecycle harness runs the same modules without it. | Drop unless the merged connect step needs it. | Low |

## Proposed end state
File removed; `google-accounts-lifecycle.mjs` gains one "connect and matched return" trace. `services/index.mjs` lists one GoogleAccounts campaign.
