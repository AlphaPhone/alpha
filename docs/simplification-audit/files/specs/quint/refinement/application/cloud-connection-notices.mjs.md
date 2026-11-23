# specs/quint/refinement/application/cloud-connection-notices.mjs
- Lines: 232 | Kind: Quint refinement harness, full flag-off app in Chromium (own Vite server + Playwright) | Verdict: KEEP (or MERGE into a Playwright journey; owner call)
- Covers: Eliza Cloud plan notice and sign-in-expiry notice share one bounded scrollable stack between header and dock; each keeps its own controls and dismissal; Settings/Inbox/conversation suspend the stack and Back restores it; touch targets own their centres at 412x915 and 360x480 with 150% text (`apps/app/src/runtime/connection-ui.tsx`, `connection-ui.css`). Duplicates: `test/browser/native-cloud-subscription.spec.ts` shares `test/browser/helpers/cloud-connection-notices.ts` (`observeCloudNotices`) and covers the plan notice journey. Callers: `test/quint-cloud-connection-notices.test.mjs`, `index.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 149-158 | B5 | Hashes every file under `apps/app/src` and `.eliza/client-features` as inputs, then a Vite transform plugin asserts the served `connection-ui.tsx`/`.css` equal the captured hash. Evidence ceremony; any renderer change invalidates the receipt. | Hash only the model and the two watched files; drop `filesWithin` of whole trees. | L |
| 2 | 159-196 | C5 | Starts its own Vite dev server, Chromium, network fencing and WebSocket fencing: a second copy of the Playwright harness (`playwright.config.ts` webServer + `flag-off-android.ts`). | Run inside the Playwright `chromium` project as a spec that calls the same `exercise()` and `checkTraces`, reusing the shared server; or keep as is but share the launcher with `calendar-mounted-editor.mjs`. | M |
| 3 | 136-145 | T10 (weak) | `nativeFixture` serialises fixture functions with `toString()` and prepends a `__name` shim for the TS loader. Fragile across loaders. | Goes away if run as a Playwright spec (`page.addInitScript(fn, arg)` directly). | L |
| 4 | 202-208 | T6 | `page.evaluate(import('/src/runtime/connection-ui.tsx'))` to grab `connectionController` and assert flag-off state; and `import('/src/browser/display.ts')` to apply 150% text. | Acceptable for observation; the text-scale input could use the real display setting UI in a journey. | L |
| 5 | — | P1 | Runtime: Vite cold start (180 s goto timeout), 120 s notice wait, two pages. One of the slowest application harnesses. | Path-filter to `connection-ui.*`, display adapter and the model. | — |

## Proposed end state
Either: a `journeys/connection-cloud.spec.ts` case in the Playwright chromium project that records the trace and calls `checkTraces` (one server, one fencing helper),
or: this harness kept but with inputs reduced to the model and watched files and the server/browser launcher shared with the other mounted harnesses.
