# test/browser/dev-reload.spec.ts
- Lines: 37 | Kind: tooling test in a Playwright costume (T5/T9): spins up throwaway Vite servers to test `scripts/browser-full-reload.ts`; never loads the app | Verdict: DELETE
- Covers: the dev-server plugin `browserFullReload()` (used by `vite.config.ts`) reloads once per real edit (polled and native watchers, atomic replacement) and ignores unchanged notifications. Duplicates: none. Callers: chromium project; imports `../../scripts/browser-full-reload` (only other user: `vite.config.ts`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-28 | T5 | Four loop-expanded tests (polling × replacement) plus one more create temp dirs and real Vite servers; they test developer reload ergonomics, not a release rule. | Delete. If the owner wants the plugin guarded, move one case to a Node test under `test/` (no browser project needed beyond one page). | Low: a broken plugin is visible to developers immediately. |
| 2 | 25, 34 | T8 | Two fixed `waitForTimeout(500)` sleeps. | Gone with the file. | None. |
| 3 | 22 | — | Emits a synthetic watcher `add` to imitate macOS native watchers: the test encodes platform folklore. | — | — |
| 4 | — | P1 | Runs in every chromium shard although only `scripts/browser-full-reload.ts` / `vite.config.ts` can affect it. | Deleting removes it from the browser lane. | None. |

## Proposed end state
Deleted. Owner question: is `browserFullReload` (sha256 fingerprinting of `.eliza/client-features`, needed because prototype adapters patch classes at boot, D2) still needed once the adapter monkey-patching is replaced? If yes, keep it untested or with one Node test.
