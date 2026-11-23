# specs/quint/refinement/application/automatic-app-update-schedule.mjs
- Lines: 170 | Kind: Quint refinement harness (imports real upstream scheduler; transplants sliced settings-adapter poll) | Verdict: KEEP model, PORT the renderer-poll half
- Covers: (a) the shared upstream `createAppUpdateScheduler` foreground/backoff/no-overlap/dispose behaviour, (b) Alpha's `pollAutomaticUpdate` (manifest check → native facts → install) against `AutomaticAppUpdateSchedule.qnt` (160 lines, live). Duplicates: upstream scheduler tests in `vendor/eliza` cover (a) generically; nothing else covers (b). Callers/importers: `index.mjs`, `test/quint-automatic-app-update-schedule.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 53-57, 69-85 | T2/T10 | Slices `prototype/settings-adapter.ts` between `// settings-facts:begin`/`// settings-facts:end` markers (D7 marker comments kept for tests) and from `'  async function pollAutomaticUpdate('` to `'\n  let gmail ='`, strips types and runs in `vm` with ~12 stubbed closure names (`owner`, `connectionController`, `updateBusy`, `savedUpdate`, `checkForUpdate`, `device`, `system`, `document`…). | Extract `prototype/automatic-update-poll.ts` exporting `createAutomaticUpdatePoll(deps)` plus `automaticUpdateIdle` and `parseUpdateManifest` (the facts region likely already is a pure block — move it into `runtime/update-manifest.ts`). Import via `bundledSource`; delete the `settings-facts` marker comments. | Med |
| 2 | 19-26 | B5 / T1 | Hashes the prepared and pinned upstream file and asserts `.source.json` entries and that `appUpdateResumePatch` is absent ("retired updater patch has no receipt"). Provenance of the projection is `prepare-client-features`'s job; the "absent key" check is a tombstone. | Delete lines 19-26 (keep `checkClientFeatures()` once in the runner). | None |
| 3 | 28-52 | P6 / §2.9 | The first four scenarios test only the upstream scheduler with a fake `run`. Upstream behaviour modelled in the consumer. | Keep only if the model needs them as the baseline; otherwise drop and rely on `runPoll` scenarios, which drive the same scheduler with the real poll. | Low |
| 4 | 14-17 | B5 | Sources list includes scripts and strip-types for hashing. | Drop. | None |

## Proposed end state
~120 lines: real upstream scheduler + imported Alpha poll module, the 12 `runPoll` scenarios, no provenance checks.
Product prerequisite: extract the poll from `settings-adapter.ts` (also shrinks that adapter).
