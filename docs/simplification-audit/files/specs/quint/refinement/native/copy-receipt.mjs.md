# specs/quint/refinement/native/copy-receipt.mjs
- Lines: 180 | Kind: Quint refinement driver (Node; starts Vite on the real app config, launches Chromium, imports `/src/prototype/browser-camera.ts` and drives `browserPhotoLibrary` edit/copy/replace with real IndexedDB and canvas) plus mutation canaries | Verdict: KEEP; MOVE to the application family; SIMPLIFY
- Covers: model `CopyReceipt` (live): photo edit save receipts. One parameter set and mode per receipt, replace overwrites exactly the reviewed original, recovery read retires a suspended save, identity edit makes no copy, cancel removes/retires receipts, source revision change or trash prevents commit, expired editor cannot commit, decode failure keeps the original, copy and receipt roll back in one IDB transaction. 11 scenarios. Duplicates: `test/browser/browser-photo-edit.spec.ts` (Playwright, same boundary; cited in the file), `test/quint-copy-receipt.test.mjs` (wrapper plus two canaries). Callers: `index.mjs:70`; `test/quint-copy-receipt.test.mjs` (`checkCopyReceipt`, `checkCopyReceiptCanary`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | — | D11 | Renderer/IndexedDB model under `refinement/native`. | Move to `refinement/application`. | Low |
| 2 | 112-121 | T10 | Vite `transform` injects `globalThis.copyReceiptSession` after the anchor `'const edits=new Map<string,EditSession>();'` and, for canaries, replaces two exact guard strings. The module is otherwise imported for real (good). | Export a read-only `editSessionSnapshot(id)` from `browser-camera.ts` (dev/test-only via the D5 flag) so only the canary needs text replacement. | Low |
| 3 | 15-18, 180 | B5 / T5 | Mutation canaries (`retired`, `replace`) prove the trace check can fail. Each canary is a full Vite+Chromium run; the wrapper runs the campaign three times. | Keep one canary at most, or run canaries only on changes to `browser-camera.ts`. | Low |
| 4 | 100-103 | B5 / P1 | Receipt sources hash every file under `apps/app/src` and `.eliza/client-features`; and the transform asserts each loaded module's hash equals the pre-run hash. Any renderer change re-runs this (slow) campaign. | Path-gate on `browser-camera.ts` and its imports; drop the per-module hash equality (Vite serves the file it read). | Medium (CI time) |
| 5 | — | runtime | Starts Vite and Chromium (tens of seconds); the heaviest native-family driver. | Run in the browser/Playwright lane, not with JVM harnesses. | — |
| 6 | 30-35, 88-90 | T6 | Patches `HTMLImageElement.prototype.decode` and `IDBObjectStore.prototype.put` in page to hold/abort. These are controlled-port seams, acceptable for a refinement driver. | Keep. | — |

## Proposed end state
Application-family driver importing the real photo library, with a snapshot export instead of an injected global, one canary, and a path filter so only Photos changes run it.
