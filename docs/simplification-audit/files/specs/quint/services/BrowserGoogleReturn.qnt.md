# specs/quint/services/BrowserGoogleReturn.qnt
- Lines: 30 | Kind: Quint model, live (7 tests, `safety` = 2 invariants); models a development-server callback | Verdict: KEEP; PORT its harness (text-sliced)
- Covers: in the dev bridge, a loopback `/google-return?` callback is only a wakeup, and access needs a canonical account readback (`ReadbackRequired`, `PendingDoesNotGrant`). Sources: `scripts/browser-cloud-dev-bridge.ts`, `apps/app/src/runtime/google-connection-ui.tsx` (exist). Duplicates: none. Callers: harness `refinement/services/browser-google-return.mjs` (61 lines). **Only the aggregate `refinement/services/index.mjs` runs it**; no per-model wrapper (`git grep checkBrowserGoogleReturn` → index only).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness 18-23 | T10 / T2 | The harness reads `scripts/browser-cloud-dev-bridge.ts` as text and slices from `"  if(req.url?.startsWith('/google-return?')"` to `'  if(req.url===GOOGLE_BROWSER_RETURN'`. It strips types with `test/support/strip-types.mjs` and evaluates the fragment with `new Function('workspaceReturns','admitted','send','createHash','UUID','Date', …)`. Reformatting the bridge (Prettier D9) or moving it to `dev-server/` breaks it. | PORT: export `googleWorkspaceReturn({workspaceReturns, admitted, send, now, uuid})` from the bridge. Import it with `sourceModule`, then delete the slicing and `strip-types` dependency. | high (blocks the formatter commit) |
| 2 | — | coverage | Aggregate-only, like `workflow.mjs`/`policies.mjs`/`reading.mjs`/`calendar-linked.mjs`. | Add a per-model wrapper before deleting the aggregate. | high if the order is wrong |
| 3 | 18 | — | `action spoofSignal = s' = s` is a stutter labelled as an attack. It documents that a forged signal changes nothing. | Keep. It is cheap. | none |
| 4 | manifest | — | `google-connection-ui.tsx` is listed as a source but the harness never loads it. | Keep as a selection input if it really consumes the wakeup; otherwise drop it. | low |

## Proposed end state
A 30-line model, with its harness importing an exported callback handler, run by its own wrapper. The harness must be ported before the Prettier commit and before the bridge moves.
