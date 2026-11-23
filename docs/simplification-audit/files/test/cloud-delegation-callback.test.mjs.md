# test/cloud-delegation-callback.test.mjs
- Lines: 189 | Kind: bundled component in JSDOM (esbuild-bundles real `runtime/cloud-delegation-ui.tsx`, replaces `platform-plugins` and `native-connection` with `globalThis` proxies, renders `CloudDelegationPanel` and clicks buttons) | Verdict: REWRITE as `journeys/connection-cloud.spec.ts` steps (delegated app authorization) using the dev native bridge
- Covers: delegated authorization (Cloud app-auth) return handling: a return during a status request is consumed after it; expired record clears the native return; a return for another account is left alone; owner retirement during a secure read consumes nothing; replaced authorization is not completed; Cancel reads Cloud state first and adopts a completed grant; revoke survives a failed list read; scope or client change cannot adopt the old grant. Duplicates: none found in `test/browser` (grep `delegation` hits only digest/adapter specs). Callers/importers: `npm test` glob only; writes a temp dir inside the repo root (`.delegation-callback-test-*`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5 | - | Bundles into a temp folder in the repo root, not `os.tmpdir()`; a crash leaves `.delegation-callback-test-*` behind. | Gone with the rewrite. | Low |
| 2 | 8-11 | T3 | Native plugin and secure store replaced by proxies over globals. Panel logic is real. | Journey uses the dev Capacitor bridge fake instead. | - |
| 3 | 41-189 | - | Eleven real interleavings on account-bound credentials; no other coverage. Security-relevant (a code staged under the wrong account). | Carry: (a) return during status, (b) expired, (c) other-account return untouched, (d) Cancel adopts completed grant, (e) scope change does not show old grant's Revoke. Drop the rest or keep as a model trace. | Medium |
| 4 | - | D5 | Check that delegation is product-reachable (D5 deletes hosted/paired paths); if only test-mocks reach it, the whole feature is a deletion candidate. | Owner/stage-A check. | Medium |

## Proposed end state
Deleted after `journeys/connection-cloud.spec.ts` gains five delegation steps; if the interleavings matter more than a
journey can show, model them in Quint instead of a host unit test.
