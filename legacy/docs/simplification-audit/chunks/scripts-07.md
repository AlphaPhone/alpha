# Chunk scripts-07: `scripts/ci` (hosted inputs, resident emulator harness, release signing, CI glue)

29 files reviewed. Reports are under `docs/simplification-audit/files/scripts/ci/`.

| File | Kind | Verdict | Target / note |
|---|---|---|---|
| hosted-native-inputs.py | CI script | KEEP, SIMPLIFY | import `embedding_artifacts`; drop `git show` re-hash and shape checks of committed records |
| pending-recovery-ui.py | emulator runner | KEEP, SIMPLIFY | `main()`, phase table, shared prelude → `resident_emulator.py` |
| prepare-dafny.sh | CI setup | KEEP; MERGE twin | `lemma-check.yml` inline install calls this; one Dafny lane |
| prepare-host-test-json.sh | CI setup | KEEP | composite setup action |
| private-apk-storage.py | release lib | KEEP, SIMPLIFY | one `download_object` (absorbs `qualified-app-update.signed_download`); rename `private_apk_storage.py` |
| private-artifact-identity.json | config record | MOVE | `docs/release/`; drop T1 test block in `test/qualified-app-update.test.mjs` |
| qualified-app-update.py | release script | KEEP (owner Q), SIMPLIFY | shared storage/JSON helpers |
| read-required-checks.ts | owner tool | MOVE, SIMPLIFY | `scripts/owner/`; delete `test/ci-ruleset-readback.test.mjs` |
| recovery_ui_guard.py | emulator lib | KEEP, SIMPLIFY | split `admit_display`; `terminal()` shared |
| release-custody-proof.py | release script | KEEP | SHA-pinned; rename only at next pin rotation |
| release-custody-proof.test.py | tooling test (real OpenSSL) | KEEP, MOVE | `test/release-custody-proof.test.py` |
| reproduce-bun-spawn-seccomp.py | one-off repro | DELETE | with `bun-spawn-seccomp.yml` |
| reproduce-paradee-model.py | one-off repro | DELETE (owner confirm) | with `reproduce-paradee-model.yml` and block in `test/ci-pin-bound-scripts.test.mjs` |
| required-checks-ruleset.json | config | KEEP, MOVE | `scripts/owner/` |
| required-result.ts | CI aggregator | KEEP | used by every path-scoped lane's result job |
| resident-native.py | emulator runner | KEEP, SIMPLIFY | shared prelude; use `terminal()` |
| resident-phase.py | CI supervisor | KEEP, SIMPLIFY | formatter, `main()` |
| resident_absence.py | emulator lib | KEEP, SIMPLIFY | drop unused return; into `resident_emulator.py` |
| resident_crash_diagnostic.py | emulator lib | MERGE | `resident_crash.py` |
| resident_fixture.py | emulator lib | KEEP, SIMPLIFY | absorbs `resident_native_source.py` |
| resident_native_source.py | emulator lib | MERGE | into `resident_fixture.py`; drop tool self-hash |
| resident_uid_crash_audit.py | emulator lib | MERGE | `resident_crash.py` |
| run-browser.ts | CI script | KEEP, SIMPLIFY | or subcommand of `affected.ts` |
| seal-signed-apks.py | release script | KEEP pending owner Q | delete with CMS branch if CMS delivery is retired |
| sign-os-ota.py | release script | KEEP, SIMPLIFY | plain imports, `ci_common` |
| sign-os-ota.test.py | tooling test (real ZIPs) | KEEP, MOVE | `test/sign-os-ota.test.py` |
| speech-candidate.ts | CI script (unreachable job) | DELETE (owner confirm) | with `android-emulator.yml` `fused-speech` job/`all` option |
| test-acquire-resident-bun.py | unit + upstream CLI test | REWRITE | `test/acquire-resident-bun.test.py`, 2 transport cases only |
| test-pending-recovery-phases.py | AST transplant (T2) | DELETE | remove from `python-suites.test.mjs:26` and `resident-android.yml:570` |

Counts: KEEP 19 (incl. MOVE/SIMPLIFY), DELETE 4, MERGE/REWRITE 4 (+2 MOVE-only of config/tool counted in keep).

## Behaviours that lose coverage if the DELETEs happen
- **Recovery-UI cleanup contract** (an owned secondary user is retained, never removed, when the switch back to user 0 fails; method order/options per phase): only offline coverage is `test-pending-recovery-phases.py`. The emulator job (`resident-android.yml` `recovery-ui`) runs only on main push and has been 0/40 green. Replacement: after `pending-recovery-ui.py` gets `main(run=...)`, one small test of the cleanup path with a fake `run` (import, not transplant).
- **Hosted x86_64 voice candidate admission** (`speech-candidate.ts`): unreachable today, so nothing is actually lost; on-device voice qualification remains physical-device only.
- **Bun lock target selection** (`test-acquire-resident-bun.py` TargetTests): covered by the real acquisition step in the same job.
- **Upstream seccomp shim semantics / Paradee converter reproducibility**: belong to upstream CI (D14 follow-up).

## Shared helpers worth creating
- `scripts/ci/ci_common.py`: `require`, `HEX`/`COMMIT` regexes, `sha256_file`, strict JSON (`pairs`/`decode`), bounded subprocess read. Replaces copies in `hosted-native-inputs.py`, `private-apk-storage.py`, `qualified-app-update.py`, `sign-os-ota.py`, `seal-signed-apks.py`, `release-custody-proof.py`, both crash modules.
- `scripts/ci/resident_emulator.py`: emulator/user admission, `run`, `guard`, `installed`, package-cleanup context manager, `assert_no_resident`, `terminal()`; used by `resident-native.py` and `pending-recovery-ui.py`.
- `scripts/ci/resident_crash.py`: merged crash projection + UID audit.

## Cross-file actions
- Rename hyphenated Python CI modules to underscore names (removes 9 `importlib` path loaders); update `scripts/quint-lib.ts:38`, `specs/quint/services/manifest.json:2931-2932`, `specs/quint/refinement/services/protected-app-update-promotion.mjs:60,203` and workflows in the same commit. `release-custody-proof.py` only at the next `proof_sha256` rotation.
- Move Python tests to `test/` with one naming scheme; run each once (`test-recovery-ui-guard.py`, `test-resident-phase.py` currently run twice).
- `lemma-check.yml` uses `prepare-dafny.sh`; Dafny proofs in one lane.
- Stage A5 (Android legacy readers): `pending-recovery-ui.py` phase `reminder-alert-timing` runs `numericLeadDueTimeStaleTargetsAndLegacyReceiptsRemainBound`; rename/trim together.
- Delete `bun-spawn-seccomp.yml`, `reproduce-paradee-model.yml`, the `fused-speech` job, and the test blocks that read them (`ci-pin-bound-scripts.test.mjs:25-35`, `ci-emulator-evidence.test.mjs` speech parts).
- `resident_native_source.py` self-hash of `scripts/local-agent-source.ts`/`stage-local-agent-sources.ts` removed; update `scripts/source-snapshot.ts:46`.
- Keep the three required check names stable when splitting CI lanes (`required-checks-ruleset.json`, D12).

## Owner questions
1. Is CMS delivery (`seal-signed-apks.py`, `release-cloud-app-signing.yml` `else` branch) still used? `qualified-app-update.py` refuses CMS, so CMS-sealed runs can never be published.
2. Keep `publish-qualified-app-update.yml` + `qualified-app-update.py` (never run) and its Quint model, or retire all three together?
3. Delete `speech-candidate.ts` and the unreachable `fused-speech` emulator job until hosted voice staging exists?
4. Delete `reproduce-paradee-model.py`/workflow (never run) and `reproduce-bun-spawn-seccomp.py`/workflow (two runs, 2026-10-03)?
5. Should resident-android (and with it the only proof of the recovery-UI and resident-native harness) run on every main push given 0/40 green, or on dispatch/release only?
