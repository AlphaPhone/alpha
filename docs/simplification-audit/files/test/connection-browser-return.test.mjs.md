# test/connection-browser-return.test.mjs
- Lines: 66 | Kind: transplant (slices `openConnectionBrowser` from `apps/app/src/runtime/native-connection.ts` at the `export async function openConnectionBrowser(` marker to end of file, strips types, runs it in `vm` with fake `document`/`window`/`native`) | Verdict: DELETE (behaviour moves to an integration test over the real import)
- Covers: the Cloud sign-in browser hand-off settles on a real foreground return (hidden then visible), not on a bare `focus`, retires the same native request on return or abort, and removes its listeners. Duplicates: none exact; `test/browser/dev-connection-pagehide.spec.ts` and the connection production specs drive sign-in but not the visibility race. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-10 | T2 | Slice starts at a literal marker and takes the rest of the file; any function added after `openConnectionBrowser` is evaluated too and breaks the test. | Delete the slice; `openConnectionBrowser` is already exported, so an integration test can import it (tsx) with `document`/`window` from jsdom and a fake `native` port passed in. | Low |
| 2 | 11-16 | T3 | Hand-written `EventTarget` subclass counting listeners: a unit-level probe. | Listener leak check is worth one assertion in the integration case, nothing more. | Low |
| 3 | 31-66 | — | Eight cases; the distinct behaviours are: (a) visibility return releases a delayed native reply and cancels the same requestId, (b) focus alone never completes, (c) abort wins and retires the request, (d) native launch failure rejects with no lingering listeners. The rest are permutations. | Carry a–d. | Medium: (b) is a real sign-in race fix. |

## Proposed end state
File deleted. Cases a–d move to `test/integration/connection-cloud.test.ts`, importing `openConnectionBrowser` from
`apps/app/src/runtime/native-connection.ts` directly. If `native` is a module-level binding rather than a parameter, the
product function needs a small seam (`openConnectionBrowser(url, signal, native = connectionNative)`). No Playwright
journey is needed: Chromium cannot produce the Android Custom Tab visibility sequence.
