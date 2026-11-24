# scripts/verify-packaged-runtime.py
- Lines: 274 | Kind: release gate script (Python; verifies resident runtime bytes in each APK against the staged tree, the source stamp, worker inventory, mobile/core build receipts and ABIs) | Verdict: MERGE (port to TypeScript `scripts/packaged-runtime.ts`, called in-process by `verify-apks.ts`), then DELETE
- Covers: a release APK either packages exactly the authenticated staged runtime or is not distributable. Duplicates: `MOBILE_CORE_SOURCE_TARGETS` (25–38) copies `upstream-core-sources.ts` keys; `read_build_policy_source` (47–52) copies `build-policy-source.ts`; the stamp hash check (75–79) copies `verify-upstream.ts:54-62`. Callers/importers: `verify-apks.ts:300` (subprocess), `generate-sbom.ts`, `release-distributable.ts` (comment), `source-snapshot.ts`, `quint-lib.ts:35`; tests `test/packaged-runtime.test.py`, `verify-apks.test.mjs`, `core-state-patch.test.mjs`, `mobile-uuid-build.test.mjs`, `one-runtime-profile.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | C7 | Second language for a step driven by a TS script; stdout-JSON + exit-code-3 protocol; its own Python test. | Port to TS as a function returning the same row shape; delete the `.py` and `test/packaged-runtime.test.py` (behaviour covered by running `verify-apks` in the Android lane). | Medium: release gate; diff the produced `runtimePackaging` JSON before/after on one build. |
| 2 | 243–247 | A8 | Refuses removed `--runtime-profile`/`--local-embeddings` flags. | Delete. | None |
| 3 | 82–83, 224–225 | A8/A1 | "legacy debug builds still require both" ABI comments and branch. | Keep the rule if debug still ships x86_64 (emulator) — reword without "legacy". | Low |
| 4 | 25–38, 171 | C7/B5 | Hand list compared against the policy file's own keys. | Delete the list; read keys from `upstream-core-sources.json`. | Low |
| 5 | 77, 161–164, 183–187 | pattern 2.9 (self-provenance) | Staged receipts must match hashes of `scripts/prepare-local-agent.ts`, `local-agent-source.ts`, `build-mobile-agent.ts`, `mobile-uuid-adapter.ts`, `mobile-bundle-smoke.ts`, `build-policy-source.ts`, `core-state-*.ts`, `combined-agent-source.ts`. Any refactor of those tools forces re-staging and makes them look like build inputs. | Owner/architecture decision: stamp on the pin + prepared-tree content, not the tool source. Out of scope for a pure port; the port keeps the rule until that decision. | High if changed carelessly (release provenance). |
| 6 | 139 | B4 | `mobile_policy_file.exists() or …` — the policy file is committed, so the branch is always taken. | Make the mobile receipt unconditional. | Low |
| 7 | 174–176 | — | One `git show` subprocess per core file (12). | Use `upstream-native-source.ts` reader once ported. | None |
| 8 | 197–200 | — | Spawns `node scripts/native-view-policy.ts` to recompute declarations. | Import its function directly after the port. | None |
| 9 | 40–57 | C3 | Local digest helpers. | `scripts/lib/hash.ts`. | None |

## Proposed end state
`scripts/packaged-runtime.ts` exports `verifyPackagedRuntime(apk, {release})` with the same checks and output; `verify-apks.ts` calls it per APK; no Python, no subprocess protocol, no flag tombstone, no duplicated core list. The self-provenance hashing is reported to the owner as a separate decision.
