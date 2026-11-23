# scripts/gradle-verification.ts
- Lines: 304 | Kind: release tooling (checks and writes `android/gradle/verification-metadata.xml`; checks Gradle repository declarations) | Verdict: KEEP, SIMPLIFY
- Covers: every Gradle artifact is SHA-256-pinned, every shipping runtime coordinate has a pin, aapt2 is pinned for three hosts, only reviewed repositories and publisher groups are used, no Maven mirror property. Duplicates: none. Callers/importers: package.json `android:deps:check`, `android:deps:write-verification`; `scripts/generate-licenses.ts` (`HOST_TEMPLATES`, `referencePath`), `scripts/generate-sbom.ts` (`METADATA`, `coordinateChecksum`, `parseVerificationMetadata`); tests `gradle-verification`, `one-runtime-profile`, `sbom`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 65-67, 204 | A1/A8 | Two accepted origins for the aapt2 checksums: `AAPT2_ORIGIN` ("... by scripts/gradle-verification.ts") and `LEGACY_AAPT2_ORIGIN` ("... .mjs"). The committed metadata contains only the `.mjs` string (2 entries) and never the `.ts` one, so the "legacy" value is the live one and the "current" one has never been written. | Keep one constant whose value is the committed string (or rewrite the two `origin` attributes once and keep only the `.ts` value). `origin` is informational to Gradle; the change is a two-line metadata edit, reviewed. | L |
| 2 | 3, 267 | A8 | `refuseRemovedProfileFlags(args)` refuses flags removed by an earlier migration (research/scripts.md: delete `removed-profile-flags.ts`). The argument parser already rejects every unknown flag with usage. | Delete the call and the import. | L |
| 3 | 227-229 | T1 | `MIRROR_FREE` reads 13 files (including other scripts) as text and fails if any mentions `mavenCentralMirrorUrl`. This is a source-text rule inside a release tool. It does guard a real supply-chain property (no mirror configured anywhere in the build inputs). | Keep, but limit it to the Gradle inputs (`HOST_DESCRIPTOR`, `product.gradle`, the host templates); scanning `scripts/*.ts` for a string also matches this file's own explanations if it ever lists itself. | L |
| 4 | 1-24 | — | Two imports sit above the doc comment and the rest below it. | Group imports after the comment. | L |
| 5 | 259 | C3 | Inline `createHash('sha256')`. | Shared hash helper. | L |
| 6 | 277-278 | — | Deletes six environment variables before the write build; correct (the write must resolve the production dependency set), but the same list is likely repeated in `build-android.ts`. | Share a `productionGradleEnv()` with `build-android.ts` if the lists match. | L |
| 7 | many | — | Exports used only by `test/gradle-verification.test.mjs` (`addArtifact`, `declaredRepositories`, `repositoryProblem`, `buildScripts`, `parseVerificationArgs`, constants). This is tooling that gates a release, so its test is wanted; the exports are acceptable. | Keep. | L |

## Proposed end state
About 285 lines with one aapt2 origin, no removed-flag refusal, imports grouped, shared hash helper. Behaviour of `--check` and `--write`
unchanged; `npm run android:deps:check` stays the release gate.
