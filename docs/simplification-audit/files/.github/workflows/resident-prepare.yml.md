# .github/workflows/resident-prepare.yml
- Lines: 70 | Kind: PR workflow (prepared runtime source checks) | Verdict: KEEP, SIMPLIFY (explicit path filter; fold into the main PR workflow as the `prepare` lane)
- Covers: `agent:prepare` of the pinned upstream runtime, Cloud recording signature classifier, managed Calendar rejection over the prepared SDK graph (`test/calendar-managed-rejection.test.mjs`), digest restart across processes, and the portable workflow-worker proof artifact. Duplicates: `digest-restart.yml` (same digest step; delete that file), `resident-android.yml:244` (`test-resident-phase.py`). Callers/importers: PR + dispatch; uses `changes.yml` (`prepare` output); `affected.ts:37` selects it only when this file changes or a path is "unknown"; named in `test/calendar-managed-rejection.test.mjs` (comment). Not a required check.
- Health: ~6 min, 70-min timeout.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-15 (affected.ts) | P1 | The `prepare` lane has no positive path list: it runs for any path `affected.ts` does not classify (all `scripts/**`, `specs/lemma/**`, other workflows) and never for the paths it actually depends on unless they are unknown. | Give `prepare` an explicit list in `affected.ts`: `upstream.lock.json`, `vendor/eliza`, `scripts/prepare-local-agent.ts`, `scripts/local-agent-*.ts`, `scripts/test-local-digest-restart.ts`, `scripts/check-cloud-recording-signature.ts`, `scripts/*workflow-worker*`, `scripts/ci/export-browser-proof.ts`, `scripts/ci/resident-phase.py`, `test/calendar-managed-rejection.test.mjs`, `package-lock.json`, this file. | Low. |
| 2 | 31 | T9/T4 | `python3 scripts/ci/test-resident-phase.py` is a unit test of the supervisor script, also run in `resident-android.yml:244`. | Move to the host lane (`test/python-suites.test.mjs`) and delete both workflow steps. | None. |
| 3 | 40-43 | T5/D4 | `calendar-managed-rejection.test.mjs` tests the upstream managed Calendar transport (elizaOS/eliza#36598) in a prepared SDK copy. It is upstream behaviour (D14) and Calendar linked sync is under D4/D18. | Keep for now (it is the only check that the pinned SDK still rejects explicitly); list as upstream follow-up and re-decide with Q-CAL-1. | Owner. |
| 4 | 32-49 | B5 | Every step wrapped in `resident-phase.py` with its own seconds budget. | Keep the supervisor around `agent:prepare` (disk admission matters there); plain steps with `timeout-minutes` elsewhere. | Low. |
| 5 | 38-39 | P5 | `npm ci` + `upstream:prepare-client` repeated from other workflows. | Use the shared `node-setup` composite. | None. |
| 6 | whole | P3 | Separate workflow calls `changes.yml` again for the same event. | Make it the `prepare` job of the main PR workflow, sharing the single `changes` job. | Low. |

## Proposed end state
- A `prepare` job in the PR workflow, selected by the explicit path list in #1: node-setup + Bun → supervised `agent:prepare` → Cloud signature check → managed Calendar rejection → digest restart → worker proof + uploads.
- The only runner of `agent:test-digest-restart` in CI (after `digest-restart.yml` is deleted).
