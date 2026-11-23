# specs/quint/refinement/services/protected-app-update-promotion.mjs
- Lines: 258 | Kind: mixed: workflow-YAML structure assertions (T1) + Python child campaign + real `deliver()` from `scripts/deliver-app-update.ts` against closed release/read ports | Verdict: KEEP model; SIMPLIFY (delete `checkWorkflows`)
- Covers: `ProtectedAppUpdatePromotion` (live, `manifest.json:2893`): signing admission, private object upload, protected publication review and signed restore (via the `.py` campaign), then public delivery: version floor (current and legacy tag), pointer race, idempotent retry, late inventory changes, before/after/partial effect faults on create/APK/manifest, anonymous readback. Duplicates: `test/qualified-app-update.test.py` and `test/cloud-signing-input.test.py` exercise the same Python helpers; `test/deliver-app-update*.test` (other chunk) exercises `deliver()`; `app-update-candidate.mjs` covers the candidate half. Callers: `services/index.mjs:54,82` only - no per-model host test (grep), so it runs only in the services aggregate that is being deleted.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 26-79, 209 | T1 | `checkWorkflows()` parses four workflow YAML files and asserts job `if:` expressions, `needs`, `environment`, step order by `run` substrings, a regex over the signing-key shell step, and `package.json` script text. Source-text assertions on CI config. | Delete `checkWorkflows`, `ordered`, `runs` and the `yaml` import; drop the corresponding assumption sentence (line 252). Release gating belongs in the required-check ruleset and workflow review, not a Quint harness. | Low (behaviour of executed helpers still covered) |
| 2 | 210-212 | C7 / T9 | Spawns `python3 protected-app-update-promotion.py`, which itself loads `test/qualified-app-update.test.py` as a fixture module. Two languages and a test file used as a library. | See `.py` report. | Medium |
| 3 | 125-131, 225 | A1 (owner) | `LEGACY_APP_UPDATE_TAG = 'app-stable'` floor check and the "equal retained legacy floor" / "legacy inventory changes" schedules. `scripts.md` flags `deliver-app-update.ts:113-132` `checkLegacyFloor` as possibly needed while an old pointer is live. Note also `updateChannelCheckEnabled = false` in `apps/app/src/build-flags.ts:11` (D8 deletes that switch): if the installed app never reads the channel, the whole OTA publication path is release tooling with no in-app consumer. | Owner question: is the `app-stable` pointer still read by any installed build? If not, delete the legacy-floor branch in `deliver-app-update.ts`, the two schedules and the model's legacy floor. | Medium |
| 4 | 230-231 | — | Ten effect faults × before/after/partial: the valuable part (real `deliver()` with injected failures). | Keep. | — |
| 5 | 187-189 | B1 | `catch (error) { if (error instanceof assert.AssertionError) throw error; return {…refusal: error.message}; }`: classifies product refusals; fine. | Keep. | — |
| 6 | 200-207 | B5 | 20 pinned inputs including two Python test files and four workflows, captured for the receipt. | Shrinks with finding 1. | Low |
| 7 | — | P1 | No standalone runner. | Own entry in the manifest-driven runner; path filter on `scripts/deliver-app-update.ts`, `scripts/update-*.ts`, `scripts/ci/{qualified-app-update,private-apk-storage,admit-cloud-signing-input}.py`, `scripts/ci/verify-cloud-signing-input.sh`. Requires `python3`. | High if forgotten |

## Proposed end state
~180 lines: Python campaign for the private signing half, real `deliver()` for the public half, no YAML parsing. The
two documented-gap schedules ("main-push has no signer route", "dispatch archive has no attempt pin") stay only if the
owner wants the gaps recorded as model witnesses (owner question).
