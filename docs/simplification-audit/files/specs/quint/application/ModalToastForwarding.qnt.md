# specs/quint/application/ModalToastForwarding.qnt
- Lines: 86 | Kind: Quint model (live, `specs/quint/application/manifest.json`) | Verdict: KEEP; PORT harness (whole-file transplant)
- Covers: toast forwarding into the newest open dialog's live region, with exact installation (stale uninstall cannot clear a replacement) (`installToastLayer` in `apps/app/src/runtime/toast-layer.ts`). Duplicates: none. Callers/importers: `scripts/check-quint.ts` (scenarios + simulation, manifest family `application`); harness `modal-toast-forwarding.mjs` via `test/quint-modal-toast-forwarding.test.mjs` and `test/quint-application-refinement.test.mjs` (via `specs/quint/refinement/application/index.mjs`)

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness 155-156 | T2 | Strips toast-layer.ts, removes `export`, runs it in a vm and exposes the module-private `installed`. | Import via `sourceModule`; observe installation through DOM live regions instead of `installed`. | L |
| 2 | manifest | — | `main.tsx` and `template.html` listed only as captured inputs. | Keep as change triggers. | none |
| 3 | — | T4 | Runs twice. | Keep one runner. | L |

## Proposed end state
- Model unchanged.
- Harness imports the module and observes the DOM.
