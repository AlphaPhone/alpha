# Stage E: one order for tests, scripts, CI and formal

Lead reconciliation of [`tests-plan.md`](tests-plan.md), [`scripts-plan.md`](scripts-plan.md),
[`ci-plan.md`](ci-plan.md) and [`formal-plan.md`](formal-plan.md). The four plans were written separately and claim
some of the same files. This file is binding where they disagree. Implementers also follow
[`IMPLEMENT-BRIEF.md`](IMPLEMENT-BRIEF.md) (toolchain, vendor, git, identities, ledger), with the changes in §1.

## 1. Rules for this stage (they replace the matching lines of IMPLEMENT-BRIEF)

- Files may be moved, renamed, created and deleted (`mv`, `rm`, never `git mv`/`git rm`).
- Test code is rewritten here; product code changes only where a unit's row says so (an exported seam, an extraction).
  A product extraction keeps behaviour and every persisted or cross-process identity byte-identical.
- No test may read product source as text, slice it, regex it, or evaluate a transplanted fragment. A test imports a
  real module, drives a real page, or runs a real process.
- No unit tests: a test that only checks a pure function or a property of one module in isolation is deleted unless
  that function is a trust boundary with no integration or journey path through it (parsers of untrusted input,
  security admission). Then it is one table-driven case inside the area's integration file.
- One behaviour has one home. When you carry a case, delete its source in the same unit.
- Coverage at risk ([`tests-plan.md`](tests-plan.md) §3.1) is written before its source is deleted. §3.2 losses are
  accepted and listed in the ledger.
- Every unit leaves `npx tsc --noEmit` and `npm run --ignore-scripts typecheck:scripts` passing for files it owns, and
  its new tests pass when run alone. Parallel units judge only their own files.
- Playwright: every agent uses its own port, `ALPHA_BROWSER_TEST_PORT=<assigned>` (the production server takes port+1).
  Run only your own spec files. Never run the whole suite.
- Heavy commands (Quint refinement, Playwright, host suite) run one at a time per agent, with a timeout.
- The machine is shared by many agents: a failure that passes when the file is run alone is recorded as load, not fixed.
- Ledger: `docs/simplification-audit/ledger/E-<unit>.md`, same sections as before.

## 2. Authority and conflicts

| Area | Authority |
|---|---|
| `test/**` and the bodies of `scripts/test-*.ts` | tests-plan |
| `specs/**`, `LemmaScript-files.txt`, formal runners (`scripts/check-quint.ts`, `quint-lib.ts`, `check-lemma.ts`, `check-quint-refinement.ts`, `prepare-quint-history.ts`, `scripts/ci/check-changed-models.ts`), `test/quint/**` | formal-plan |
| every other file under `scripts/` | scripts-plan |
| `.github/**`, `scripts/ci/affected.ts`, `scripts/ci/required-result.ts`, `scripts/ci/run-browser.ts` | ci-plan |

Resolved overlaps:

| # | Overlap | Resolution |
|---|---|---|
| E1 | scripts-plan S11 (formal tooling) vs formal-plan U2/U4 | Formal units do it. S11 is dropped. |
| E2 | tests-plan Q1 vs formal-plan U5 (Quint runner) | U5 does it and writes `test/quint/refinement.test.mjs` and `test/quint/tooling.test.mjs` (tests-plan TP1 path, formal-plan content). Q1 is dropped. |
| E3 | tests-plan T0 vs scripts-plan S4 vs ci-plan CI-4 (`scripts/run-node-tests.ts`, `package.json`, `playwright.config.ts`) | One unit **R0** owns all three files and writes the final lane table at once: lanes `integration`, `tooling`, `quint`, `resident`, `live`; `--lane=`, path pass-through, `--shard=i/n`; transitional top-level globs until TZ. Later units change `package.json` only by replacing the value of a row they own, one `Edit` per row. |
| E4 | scripts-plan S5 (suites into `test/`) vs tests-plan H units | H units absorb the `scripts/test-*.ts` bodies as tests-plan §2 lists. S5 keeps only what tests-plan does not name: `scripts/run-upstream-source-tests.ts`, the `agent:test-*` rows, and the `scripts/fixtures/*` moves, and runs after the H units. |
| E5 | scripts-plan S8 vs ci-plan CI-1…CI-10 | ci-plan. S8 is dropped; the two S8 items ci-plan does not hold for the owner are covered by CI-2 and CI-5. |
| E6 | formal-plan P-/J- units vs stage F splits | They are the same work. P-/J- units are the large-file splits; stage F adds only the `dev/` boundary, foldering, the `@eliza/*` alias and Prettier. |
| E7 | scripts-plan S9, S10, S12 (release, signing, AOSP, packaged-runtime, Python CI rewrites) | **D22: release, signing, OTA, AOSP-image and packaged-runtime tooling is not rewritten in this change.** Its only proof is a signed release or an image build, which this change cannot run. Allowed: deleting tools nothing calls (S1), tombstones (S2), `scripts/lib` and migrating callers whose output a host test or a local run checks (S3, the verifiable part of S10), and licence/SBOM moves only if `--check` shows byte-identical output. The rest is listed in the PR as follow-up. |
| E8 | ci-plan CI-9 (replace the Calendar bridge supervisor with a Gradle task) | Done only as far as it can be checked. The `HOST` sha256 pin of `AlphaCalendarPlugin.java` must not block the cleanup: if the Gradle task cannot be proven here, keep `calendar-bridge.py` and update the pin to the cleaned file's hash, and say so. |
| E9 | Verification wording in ci-plan ("ends with a PR run … green") | The draft PR's own CI run is the check. Locally: `actionlint`, `node scripts/ci/affected.ts` table test, and each lane's command run by hand. |
| E10 | D11 "every live model passes" while harnesses are ported | A model whose harness is being ported stays registered. A unit never ends with a campaign failing that passed when it started. |

## 3. Order

Waves run in order. Units in one wave own disjoint files and run in parallel, except chains marked "serial".

| Wave | Units | Notes |
|---|---|---|
| E-1 | **R0** (runner, config, `package.json` test rows; = T0 + S4 + the `run-node-tests.ts` part of CI-4) ∥ **S0 → U0** (inventories, then Agent Calendar and the other pins the stage A–C ledgers left broken) | U0 also repairs every "Pins left broken" row of `ledger/A*.md` and `ledger/C-*.md` that concerns a model whose code was deleted or trimmed. |
| E-2 | formal chain **U1 → U2 → U3 → U4 → U5** (serial) ∥ **T2** (pure deletions) ∥ **T1** (Playwright harness) ∥ **H2, H3, H4, H5, H6, H7, H8, H9, H10, H11** ∥ **S1, S2, S3** ∥ **CI-1, CI-2** (serial pair) | T2 and the H units do not touch `test/quint-*` or fixtures a harness imports (formal-plan lists them); U5 deletes the wrappers. |
| E-3 | journeys **T3 … T13, T15** (at most six at a time) ∥ **S5′, S6, S7** ∥ ports **P-light, P-browser, P-agent, P-connection, P-voice, P-maps, P-notify, P-photos, P-google, P-workflow, J1 … J4** | A journey unit and a port unit may need the same product file: the port unit owns it; the journey unit asks for nothing in product code beyond what tests-plan lists as a seam, and records what it could not do. |
| E-4 | **T14** ∥ **P-main → P-settings**, **P-model** ∥ **S10′** (verifiable callers only) | |
| E-5 | **TZ** (final sweep) → **S13** (transplant retirement) → **U6** (formal cleanup) | |
| E-6 | CI chain **CI-3 → CI-4 → CI-5 → CI-6 → CI-7 → CI-8 → CI-9′ → CI-10** (serial; owns `.github/**`) | Runs last so lanes call the final commands. Required check names stay (D12). |
| F | `dev/` boundary, foldering, `@eliza/*` alias, then Prettier as one commit | |
| G | full verification | |

Each wave ends with a gate unit that owns the whole tree: `tsc`, `typecheck:scripts`, build, bundle audit, `npm test`
(all lanes that exist), `quint:check`, refinement, `lemma:check`, and the Playwright projects once journeys exist.
The wave is committed and pushed to the draft PR when its gate is green or its remaining failures are listed.

## 4. Revision after the merge with `develop` (2026-11-21)

`develop` changed the ground under this plan while the code stage ran:

- The repository runs on Bun. `scripts/run-node-tests.ts` is gone; `scripts/run-tests.ts` runs `test/*.test.*`
  minus `test/quint-*`, and `quint:tests` runs the Quint wrappers.
- CI is already reduced upstream: a pull request runs one job (`verify.yml`, `bun run verify`), the Android build runs
  only when build inputs change (`android.yml`), and formal models and browser tests run only on promotion
  (`promotion.yml`). `ci-plan.md` units CI-1 … CI-8 are therefore done upstream or void. **No workflow is rewritten here.**
- CONTRIBUTING.md now states the test rules this plan wanted (no new source slices or source-text assertions; whole-file
  refinement; no duplicate aggregate runners).
- `develop` receives about 250 commits a day, most of them touching tests and specs.

Consequence (D23): this change does **not** rewrite the suites into new folders (`test/integration`, journeys). A
tree-wide move of 1,300 test files cannot be merged against that rate of change and would hide coverage loss inside
renames. Stage E is reduced to what can be checked file by file on the current tree:

| Unit | Scope |
|---|---|
| E-del | Delete every host test, Playwright spec, fixture and `scripts/test-*` body whose verdict in `tests-plan.md` §1 is DELETE and which still exists, after re-checking the reason on the current file: source-text, transplant, stub unit test, test of a deleted feature, or exact duplicate of another kept test. Rows marked "carry" are deleted only when the carried case already exists in a kept behavioural test; otherwise they stay and are listed. |
| E-formal | `quint:check`, `quint:tests` and `lemma:check` at 100 %: repair or delete models, manifests, harnesses and wrappers that pin code this change deleted (ledger "Pins left broken" rows), delete models whose code is gone (formal-plan §2.2), delete duplicate aggregate runners. No harness port. |
| E-scripts | `scripts-plan.md` §1.1 "delete now" rows and S2 tombstones that still exist and have no caller. D22 stands. |
| Follow-ups (listed in the PR, not done) | Journey and integration-folder consolidation (`tests-plan.md` §2), harness ports off source text (`formal-plan.md` §3), `scripts/lib` migration, large-file splits and foldering (stage F), Prettier. |
