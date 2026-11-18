# specs/quint/application/ConnectionController.qnt
- Lines: 157 | Kind: Quint model (live: listed in specs/quint/application/manifest.json, loaded by scripts/quint-lib.ts / check-quint.ts) | Verdict: KEEP model; PORT test
- Covers: Connection controller step slot: queued native sign-in return, sign-in-incomplete notice and resident rebind ordering behind the slot. Duplicates: Composition refinement (`controllers.mjs`) also exercises the controller. Callers/importers: `test/quint-connection-controller.test.mjs` (no application harness), `specs/quint/refinement/composition/controllers.mjs`; 11 symbol pins in connection-ui.tsx.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | test 18-35 | T2/T10 | Slices six regions of `connection-ui.tsx` (`async function work(message: string` … `/** P-43: a startup path`, etc.), regex-matches the startup `.finally(...)` and `epoch++`, assembles a synthetic `connectionController`, strips types and runs in `vm`. | Make the connection controller a module (D1 split of connection-ui.tsx) exporting the slot, queue and rebind functions with injected ports; import it. | Depends on stage F; highest-value port (59 pins in connection-ui across manifests). |
| 2 | manifest symbols | T10 | 11 symbol pins. | Delete. | None. |

## Proposed end state
Model unchanged; replay imports the controller module; composition harness reuses it.
