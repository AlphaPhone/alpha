# test/sbom.test.mjs
- Lines: 285 | Kind: tooling integration (real `scripts/generate-sbom.ts`, `generate-licenses.ts`, `gradle-verification.ts`, `embedding-native-contract.ts` over the real checkout and a symlinked temp root) | Verdict: MERGE with `test/runtime-licenses.test.mjs` into `test/release-licences.test.mjs`
- Covers: the release CycloneDX SBOM is deterministic, lists every shipped npm/Maven/font/OCR/voice/embedding component with pinned hashes and licence flags matching the notices, lists verified APKs without upgrading them, and refuses changed APK bytes. Duplicates: shares the staged-runtime fixture with `runtime-licenses.test.mjs`; `test/voice-host-record.test.mjs` covers voice-host fixtures. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 163 | T1 | Regex over `scripts/build-android.ts` source to prove it calls `generate-sbom`. | Delete the assertion; `sbomArgs` is already tested at 159-162. | Low |
| 2 | 95 | T1 | Banned-word regex built by string concatenation to avoid matching itself. | Keep as one assertion on component names, or drop. | Low |
| 3 | 166-248 | C3/cost | Re-creates the staged runtime by hand, symlinks `node_modules`, `vendor`, `.eliza`, runs `git show`/`ls-tree` on the submodule and builds the SBOM four times. Embedding host is "legacy qualification record; incompatible with current Paradee engine" (117). | Share the fixture; owner question whether the legacy embedding record should still be in the SBOM at all. | Low |
| 4 | 97-102, 151-157 | T9 | Branches on whether the checkout has voice host / staged runtime. | Make each branch a fixture case. | Low |
| 5 | 20, 27, 279-284 | cost | `buildSbom(ROOT)` at import time plus a CLI spawn. | Acceptable; one build shared. | Low |

## Proposed end state
Merged into `test/release-licences.test.mjs` with one staged-runtime fixture: determinism, npm/Maven/fonts coverage,
APK listing/refusal, licence agreement with notices, flags warn but exit 0. Release-gating, so it stays; path filter:
`scripts/generate-*.ts`, `scripts/licence-policy.ts`, `licenses/**`, `package-lock.json`, `android/gradle/verification-metadata.xml`.
