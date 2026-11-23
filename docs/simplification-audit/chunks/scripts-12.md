# Chunk scripts-12: scripts p…r (+ owner rulesets)

26 files reviewed, 26 reports under `files/scripts/`.

| File | Kind | Verdict | Target / note |
|---|---|---|---|
| `scripts/owner/rulesets/alphacompute-org-shared-branch-integrity.json` | data (org ruleset draft) | KEEP as doc, MOVE | `docs/owner/rulesets/`; delete its constant-asserting test |
| `scripts/owner/rulesets/default-branch-baseline.json` | data (repo ruleset draft) | KEEP as doc, MOVE | `docs/owner/rulesets/` |
| `scripts/owner/rulesets/shared-branch-integrity.json` | data (repo ruleset draft) | KEEP as doc, MOVE | duplicate of the org draft at repo scope; owner keeps one |
| `scripts/paradee-runtime.ts` | build gate (Gradle CLI) | KEEP, SIMPLIFY | shared hash/git/walk/symlink helpers; read record once |
| `scripts/pilot-update.ts` | operator tool | KEEP, SIMPLIFY | drop test-only re-exports; one arg parser |
| `scripts/pinned-upstream-source.ts` | build gate library | KEEP + MERGE half | reachability (lines 32-109) into `verify-upstream.ts` |
| `scripts/pixel10a-source-contract.ts` | AOSP build library | KEEP, SIMPLIFY | upstream `.d.ts`; test is T5 |
| `scripts/prepare-aosp-apk.py` | manual tool | DELETE | with `test/aosp-apk-preparation.py` (owner confirm) |
| `scripts/prepare-ci-emulator.ts` | CI fixture prep | KEEP, MOVE | `scripts/ci/prepare-emulator.ts` |
| `scripts/prepare-ci-webview.ts` | CI fixture prep | MERGE | `--webview` mode of `scripts/ci/prepare-emulator.ts` |
| `scripts/prepare-client-features.ts` | build step | KEEP, SIMPLIFY | drop retired-slot refusal, `CLIENT_FEATURE_PATCHES`, `projectVoice`, race machinery; prune list after A1/A4 |
| `scripts/prepare-embedding-host.ts` | build step | KEEP, SIMPLIFY | inline `embedding-build-remap.ts`; drop post-build rehash |
| `scripts/prepare-local-agent.ts` | build step | KEEP, SIMPLIFY | drop self-hash stamp and `--requalify-from` path (+ test + Quint model) |
| `scripts/prepare-patched-native.ts` | build step | KEEP, SIMPLIFY | delete dormant patch engine (`patches/` absent); later rename `stage-native-modules.ts` |
| `scripts/prepare-quint-history.ts` | formal tooling (network) | DELETE | with `specs/quint/legacy` **and** the MMS/SMS historical probes |
| `scripts/prepared-workflow-worker.ts` | build library | KEEP + MERGE | absorb `build-workflow-worker.ts` CLI |
| `scripts/private-runtime-launch.ts` | typed upstream facade | KEEP | hub for the `start-*` launcher merge |
| `scripts/prototype-capture.ts` | manual tool | DELETE | no caller; Wallet states; backdoor run modes |
| `scripts/provision-unit.ts` | operator tool + release library | KEEP, SIMPLIFY | move admission/facts to `apk.ts`, adb to `lib/adb.ts` |
| `scripts/publish-update-manifest.ts` | release step (CI path) | KEEP, SIMPLIFY | drop re-checks `admitUnitApk` already made |
| `scripts/qualify-head.ts` | manual local CI re-run | DELETE | with `qualify-head.test.mjs` and its cases in `pilot-units.test.mjs` (owner confirm) |
| `scripts/quint-lib.ts` | formal tooling library | KEEP, SIMPLIFY | source enumeration to `specs/quint/refinement/sources.mjs`; drop symbol/regex pins and Quint-internal parser use |
| `scripts/record-release.ts` | owner release tool | KEEP | add npm alias + README step, or delete if unused (owner) |
| `scripts/regular-files.ts` | helper | MERGE | `scripts/lib/fs.ts` walker |
| `scripts/release-blockers.ts` | release policy library | KEEP, SIMPLIFY | replace text filter with an upstream option |
| `scripts/release-distributable.ts` | helper | MERGE | into `verify-apks.ts` |

## Corrections to `research/scripts.md`
- `prepare-quint-history.ts` is not legacy-only: `specs/quint/refinement/native/mms-historical-sources.json` feeds the `historicalProbe` campaigns of the live `native/mms-dispatch.mjs` and `native/sms-dispatch.mjs`. Deleting the script requires deleting those probes in the same change.
- `prepare-embedding-host.ts` is not called by the workflows directly (comments only); it runs through `build-embedding-host.ts`.
- `prepare-patched-native.ts` applies no patches: the manifest is required to have none and `patches/` does not exist; its patch engine is dormant code (A4).
- `owner/rulesets/*.json` are not "manual tools": no script reads them; they are owner documentation.

## Behaviours that lose all coverage if the DELETEs happen
- APK-hash binding of emulator/resident campaign evidence to a candidate build (`qualify-head.ts CAMPAIGNS`/`candidateManifest`). Nothing else ties campaign records to APK bytes. Needs an owner decision, or a small `candidate-evidence.ts` run by the release workflow.
- 16 KiB zipalign + stored-native repack for presigned AOSP import (`prepare-aosp-apk.py`), if it is still a manual step.
- Reproduction of the two historical MMS rejected-approval counterexamples (deliberate: a fixed bug against old upstream bytes).
- `prepare-local-agent` requalification (only meaningful while the stamp hashes the tool; goes away with the stamp change).

## Shared helpers worth keeping / creating
- `scripts/lib/fs.ts`: one walker (replaces `regular-files.ts`, `quint-lib filesWithin`, inventories in `prepare-client-features`/`prepare-patched-native`, `paradee-runtime walk`) and `assertNoSymlinkPath` (four copies in this chunk).
- `scripts/lib/hash.ts` (`sha256`), `scripts/lib/git.ts`, `readUpstreamLock()`, `node:util parseArgs` for the six hand parsers here.
- `scripts/lib/adb.ts`: `adbFor`, `type Adb`, `deviceFacts`, `packageFacts` (from `provision-unit.ts`), reused by `pilot-update.ts`, `prepare-ci-emulator.ts`, `ci/emulator-suite.ts`.
- `scripts/apk.ts`: the single `ApkManifest` type and `admitUnitApk`/`apkContradictions`/`apkRuntimeIdentity`.

## Cross-file actions
1. Self-provenance removal (research 2.9) touches `prepare-local-agent.ts`, `prepare-patched-native.ts`, `verify-upstream.ts:60`, `ci/resident_native_source.py`, `native-google-host-artifact.ts`; must land in one change with the Quint `prepared-source-stamp` model deletion.
2. `prepare-quint-history.ts` deletion: `package.json` (`quint:prepare-history`, `verify`), `.github/workflows/browser.yml:130`, `specs/quint/legacy/**`, `native/mms-dispatch.mjs`, `native/sms-dispatch.mjs`, `test/quint-tla-inventory.test.mjs`, `quint-lib.ts` legacy family.
3. `prepare-client-features.ts` list pruning waits for stage A1 (linked-sync) and A4 (pairing); `test/maps-navigation.test.mjs` deletion removes the copied upstream test entry.
4. `quint-lib.ts` source enumeration move updates `composition/{index,controllers}.mjs`, `application/shell-coordinator.mjs`, `test/quint-checker.test.mjs`; replacing `runtimeScriptPaths` with a glob changes conformance hashes once.
5. Upstream follow-ups (D14): `.d.ts` for `private-runtime-launch.mjs`, `hosted-fixture/*.mjs`, `verify-device-source.mjs`, `apk-release-record.mjs`; a `deviceQualificationBlocks` option in `apkReleaseBlockers`; a build directory outside the checkout for `stage-elizavoice-lib.ts`.

## Owner questions
- Are the three ruleset drafts applied on GitHub? If yes, delete them; if no, which one (org or repo) is the intended policy?
- Is `prepare-aosp-apk.py` still a manual AOSP presigned-import step?
- Is `qualify-head.ts` run by hand before releases, and is APK-hash binding of emulator campaigns required release evidence?
- Is `record-release.ts` the release procedure for `lastRelease`? (If yes, add an npm alias and README step.)
- Has the silent SIGSEGV/SIGILL retry in `quint-lib.ts runQuintChecker` actually fired in CI?
