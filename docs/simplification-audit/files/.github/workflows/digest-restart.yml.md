# .github/workflows/digest-restart.yml
- Lines: 65 | Kind: dispatch/var-gated host-runtime check | Verdict: DELETE (fully covered by `resident-prepare.yml`)
- Covers: `agent:prepare` then `npm run agent:test-digest-restart` (digest delivery survives a runtime process restart). Duplicates: `resident-prepare.yml:44-49` runs the identical `agent:prepare` + `agent:test-digest-restart` on every PR selecting the prepare lane. Callers/importers: dispatch; weekly cron and main-push path filter only when `vars.DIGEST_RESTART_AUTOMATIC == 'true'` (unset per research). Named in `scripts/ci/affected.ts:38` (regex), `scripts/owner/emulator-campaign-check.ts:66,204` (dispatch plan), `test/owner-emulator-campaign-check.test.mjs:57` (expects `digest-restart.yml` in the plan). Other `digest-restart` hits (`package.json`, `test/digest-restart-input.test.mjs`, browser specs) are the npm script / product feature, not the workflow.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | T4/P3 | Same work as `resident-prepare.yml` `digest-restart` step; automatic triggers are disabled by an unset variable, so it is effectively dispatch-only duplicate. | Delete. Point `emulator-campaign-check.ts:66,204` at `resident-prepare.yml` (dispatch) or the local command; update `test/owner-emulator-campaign-check.test.mjs:57`; drop from the `affected.ts:38` regex. | Low. |
| 2 | 13-18 | P1 | The one useful idea is the path filter (`upstream.lock.json`, `scripts/test-local-digest-restart.ts`, `scripts/prepare-local-agent.ts`, `scripts/local-agent-source.ts`). | Carry those paths into the `prepare` lane selection in `affected.ts` (see `resident-prepare.yml.md`). | None. |

## Proposed end state
File deleted; digest restart runs once, in the prepare lane, selected by the paths above.
