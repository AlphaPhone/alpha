# test/dev-ui-remote-host.test.mjs
- Lines: 67 | Kind: tooling (spawns the real `scripts/dev-ui-remote-host.ts` with `vite` replaced by a `registerHooks` data-URL fake) + one source-text assertion (line 38) | Verdict: DELETE (with the script)
- Covers: the remote-renderer dev CLI clears test-mock flags, sets Cloud/staging env, filters the local-backend Vite plugins and proxies only registered `/__alpha-*` routes. Duplicates: none. Callers/importers: `npm test` glob only. Research (`tests-host.md` row 697) called it pure source-text (A); it is mainly a tooling test with one T1 line.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | A7, T5 | `scripts/dev-ui-remote-host.ts` has no caller anywhere (`git grep dev-ui-remote-host` finds only this test; no npm script, workflow, README or doc). The test is the only thing keeping a personal dev tool alive (see `files/scripts/dev-ui-remote-host.ts.md`, verdict DELETE). | Delete test and script together. | Low (developer convenience only). |
| 2 | 38 | T1 | `doesNotMatch(readFileSync(dev-ui-remote-host.ts + dev-cloud.ts), /RUNTIME_PROFILE/)`: a tombstone guard on source text. | Delete. | None. |
| 3 | 24-33 | T8 | Spawns a Node child per case (4 spawns, 10 s timeout each). | Gone with the file. | None. |

## Proposed end state
File deleted together with `scripts/dev-ui-remote-host.ts`. If the owner still uses the remote-preview workflow, keep the
script with an npm entry and README line, and keep only test 3 (plugin filter + proxy pattern) as a case in
`test/tooling/dev-server.test.mjs`; drop tests 1-2.
