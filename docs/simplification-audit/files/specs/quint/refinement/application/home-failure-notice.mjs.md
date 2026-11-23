# specs/quint/refinement/application/home-failure-notice.mjs
- Lines: 158 | Kind: Quint refinement harness (source campaign, `HomeFailureNotice`, live) | Verdict: PORT
- Covers: Home shows at most one toast per new launcher error/failed inventory, only while Home (not drawer/edit/app view) is the surface (`apps/app/src/prototype/home-shell.ts` over upstream `mobile-launcher.ts`/`launcher.ts`). Duplicates: none (no host test or browser spec drives these notice rules). Callers/importers: `test/quint-home-failure-notice.test.mjs`; aggregate `index.mjs` (T4, runs twice).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 31-37 | T10 | esbuild `onLoad` rewrites `home-shell.ts` at the literal `  const shell = createMobileShellLauncher({` to leak four closure variables (`seenError, seenStatus, seenApps, launchReported`). | Move the notice decision into an exported pure function in `home-shell.ts` (input: previous seen state, launcher snapshot, surface; output: next seen state + optional notice) and observe the toasts through the `Host.toast` port, which the harness already records. | M: breaks on the D1 split of home-shell / Prettier. |
| 2 | 45-49 | T2 | Bundle is evaluated with `new Function('require','module','exports','__port','document','window', …)` and fake globals instead of `import()`. | After finding 1, `sourceModule()`/`bundledSource()` from `support.mjs` with a stub `document`. | L |
| 3 | 63-76 | D2 | `Host` re-creates the shell prototype (`S`, `setState`, `toast`, `renderVals`, `componentDidMount`) because `installHomeShell` monkey-patches a component prototype. Same `Host` shape is duplicated in `home-gesture.mjs:73-88`. | Extract one `homeHost()` helper into `support.mjs` until the D2 adapter rewrite lands. | L |
| 4 | 13-20 | — | Exact toast strings mapped to classes; a copy change fails loudly. Acceptable (it is the observable). | Keep. | — |

## Proposed end state
- Imports `installHomeShell` (or the extracted notice reducer) as a module; no source marker.
- Shares a `homeHost` fixture with `home-gesture.mjs`.
- Nine schedules kept; runs once from the manifest runner.
