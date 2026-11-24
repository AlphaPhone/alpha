# specs/quint/application/AutomaticAppUpdateSchedule.qnt
- Lines: 160 | Kind: Quint model (application family, live: registered in `specs/quint/application/manifest.json`) | Verdict: KEEP model; PORT harness
- Covers: Automatic app update poll: one owner per poll, bounded retries with back-off, background/dispose invalidates in-flight work, and the native install request is sent only after supported+idle+candidate+current facts. Models: `apps/app/src/prototype/settings-adapter.ts` (`pollAutomaticUpdate`, settings facts), upstream `upstream renderer: state/app-update-gate.ts` (exist). Duplicates: Lemma `settings-adapter` proves `updateCheckDue`/`updateIdle` (pure parts of the same feature); native update models cover the Android side. Callers/importers: manifest (12 tests); `scripts/check-quint.ts` default gate (typecheck + every manifest `tests` run + simulation) via `npm run quint:check`; changed-model symbolic verify via `scripts/ci/check-changed-models.ts` when a manifest source changes; harness `refinement/application/automatic-app-update-schedule.mjs` via `test/quint-automatic-app-update-schedule.test.mjs` and `refinement/application/index.mjs` aggregate (run by `test/quint-application-refinement.test.mjs`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness 54-56 | T10 / D7 | Harness slices `settings-adapter.ts` between marker comments `// settings-facts:begin` / `// settings-facts:end` (markers exist only for this test) and between `'  async function pollAutomaticUpdate('` and `'\n  let gmail ='`, then strips types and runs in `vm`. Upstream scheduler is imported directly (good). | PORT: move `pollAutomaticUpdate` and the facts reader out of `settings-adapter.ts` into `prototype/app-update-poll.ts` with injected ports; import it; delete the marker comments. | Medium: the settings-adapter split (D1) breaks the anchors. |
| 2 | 13-37, 31-33 | C5 | `begin`/`finish` and `beginPoll`/`finishPoll` model the generic scheduler and the concrete poll separately; both are needed for the upstream-scheduler runs. | Keep. | — |

## Proposed end state
Model unchanged. Harness imports the extracted poll module and the upstream scheduler; no marker comments in product code.
