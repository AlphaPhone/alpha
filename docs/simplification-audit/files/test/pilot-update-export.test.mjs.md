# test/pilot-update-export.test.mjs
- Lines: 275 | Kind: tooling (real `scripts/pilot-update.ts` `updateUnit`/`planHome` against the scripted adb in `test/fixtures/pilot-update.mjs`) + source-text (1 test on the manifest, `DataIntegrityProvider.java`, `apk.ts`) | Verdict: MERGE into `test/release-tooling/pilot.test.ts` (keep the export parser and the cases the refinement lacks)
- Covers: the integrity-export query and parser; per-domain lost, changed and new reporting; refusal of malformed exports; and the update window: HOME hand-off, process quiescence, force-stop order, agent restart states, HOME restore failure, a partial role change, races, the rotation journal at dispatch. Duplicates: `specs/quint/refinement/services/pilot-update.mjs` (imports the same fixture and runs the real `planHome`/`updateUnit` with faults `lost-install`, `partial-handoff`, `restore-home`, `process-list`, `stuck-integrity`, `legacy-export`, `changed-inventory`, `home-takeover`, `runningAt`, `agentLog`); `test/quint-pilot-update-refinement.test.mjs`. Callers/importers: `npm test`; `test/fixtures/pilot-update.mjs` (also imported by the Quint refinement, so it survives).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 64-82 | T1 | The provider test regexes `AndroidManifest.xml`, `DataIntegrityProvider.java` and `scripts/apk.ts`, and checks a folder is absent. | Delete. The release rule (DUMP-protected, present in release builds) is already enforced on build output by the `apk.ts` permission map that `verify-apks` uses; extend that audit if `exported`/`process` must be checked too. | low |
| 2 | 88-110, 128-136, 166-176, 178-188, 190-201, 203-219, 221-229, 231-246, 248-273 | T4 | HOME hand-off and restore, running-before-readback, force-stop order, HOME restore failure, partial role change, process start during readback, HOME takeover, no process list, stuck `:integrity` process, lost installer response: each is a named fault or option in the Quint refinement's traces. | Drop; the refinement is the integration proof of the update window. | low (the refinement must keep running in CI: confirm it is in the manifest-driven Quint runner) |
| 3 | 12-62 | — | `integrityQuery` nonce validation and shell quoting; `parseIntegrityExport` (digest-only rows, count end row, refused vs failed vs truncated vs malformed); per-domain `compareDomains`. The refinement only touches `legacy-export` and `changed-inventory`. | Keep in the merged file. | none |
| 4 | 112-126 | — | Two stock launchers need `--stock-home`; a non-HOME unit keeps its HOME. | Keep one case (`planHome` choice). | none |
| 5 | 138-164 | — | Agent restart: refused, silent, recovered after an early exit, regressed, not configured. | Keep as one table-driven case unless the refinement's `agentLog` traces already list all five (check when merging). | none |
| 6 | 275-292 | — | "readback is checked again after rotation validation" (a pid appears inside `prepareInstall`). | Keep: not a refinement fault. | none |
| 7 | 84 | — | A second top-level dynamic `import` of the same module the static import at line 9 already loaded. | Use one import. | none |

## Proposed end state
Merged into `test/release-tooling/pilot.test.ts`: the export query and parser cases, `planHome` launcher choice, the agent restart
table and the post-validation readback recheck, about 90 lines. The update-window ordering stays proven once, by the
`PilotApkUpdate` Quint refinement on the same fixture.
