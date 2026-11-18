# scripts/verify-apks.ts
- Lines: 457 | Kind: release gate script (top-level body; verifies the four app APKs + optional listener APKs and writes `artifacts/apk-manifest.json`) | Verdict: KEEP, SIMPLIFY (structure into functions, drop tombstones, absorb the Python runtime verifier)
- Covers: every APK is flag-correct, passes the shared production bundle audit, carries the exact allowed web/App Link filters, the compiled update channel, admitted native patches, owner route table, signer and version agreement, packaged runtime/voice admission and licence records; decides `distributable`. Duplicates: `verify-packaged-runtime.py` (spawned, line 300); `release-distributable.ts` (27-line predicate split out for tests). Callers/importers: `package.json:22 android:verify`, `build-android.ts`, `sign-release-apks.ts`, `generate-sbom.ts`, `render-assetlinks.ts`; named by ~20 scripts and ~20 tests (many are source-text tests, e.g. `test/android-gzip-assets.test.mjs:50` regexes line 222), `quint-lib.ts:35`, `specs/quint/services/manifest.json:2650,2934`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 58, 103 | A8 | `refuseRemovedProfileFlags(args)` tombstone for removed flags. | Delete with `removed-profile-flags.ts`; unknown flags already fail at line 105. | None |
| 2 | 113–114, 152, 217 | A1 | Refuses build records / bundles that name the removed runtime profile or `localEmbeddings`. Artifacts are rebuilt per build; no old record can reach this. | Delete the three refusals here and the twin at `sign-release-apks.ts:291-292`; keep writing `runtimeProfile: "native"` in the manifest (persisted record field) unless every reader is confirmed gone. | Low |
| 3 | 332–334 | B4 | `checkedVoiceHost` already throws on `differences` (lines 319–320); the caller re-checks and re-throws the same message. | Delete lines 333–334. | None |
| 4 | 324 | B4 | `if (!row.releaseAdmission) throw` — set unconditionally at line 287 for every release row. | Delete. | None |
| 5 | 187–190 | B1 | `catch{problems.push('…could not be verified')}` discards the reason. | Push `message(error)`. | None |
| 6 | 208–214 | B1 | Malformed `third-party-notices.json` silently becomes `runtimeNotices=false`. | Let parse errors become a problem entry. | Low |
| 7 | 203–204 | D9 | On font-check failure it calls `fontLicenceCheck` on a fabricated absent path to build a default object. | Have `font-license-blockers.ts` export an `unresolvedFontCheck(items)` constructor. | Low |
| 8 | 298–307, 309 | C7 | Spawns `python3 verify-packaged-runtime.py`, passes args, parses stdout JSON and maps exit code 3. | Port the Python verifier to `scripts/packaged-runtime.ts` and call `verifyPackagedRuntime(file, {release})` directly. | Medium: release gate; port byte-for-byte. |
| 9 | 130, 150, 354, 407 | C3 | Four inline `createHash('sha256')` uses (one reads whole APKs into memory, line 354/407). | `sha256File` / `sha256Hex` from `scripts/lib/hash.ts`. | None |
| 10 | 40, 337–339 | D4 | `releaseDistributable` lives in its own file "so tests can import it". | Inline into this module's `admitRelease()` once tests that import it are removed/ported. | Low |
| 11 | whole | D1, D8 | 457-line top-level script; cannot be imported without running it; tests therefore regex its text (T1). | Split into `inspectApk(file, ctx)`, `admitRelease(row, ctx)`, `listenerFacts(...)`, `writeManifest(...)`, with `main()` under an `import.meta` guard. | Medium (many text-pinned tests break; they are DELETE under D10). |
| 12 | 420 | — | `demoEntryPoints: testMocks` duplicates `testMocks` in the same record, but `.github/workflows/android.yml:119-121` and `qualify-head.ts:395` read it. | Drop the field and the workflow's second check together (and from `qualify-head.ts` if it survives). | Low |
| 13 | 431 | — | Persisted string "unscoped legacy signer". | Keep byte-identical (persisted value, G5). | — |
| 14 | 134 | C3 | `JSON.parse(fs.readFileSync("app.config.json"))` cwd-relative. | `readAppConfig()`. | None |

## Proposed end state
~330 lines in named functions with one `main()`; no tombstones or removed-profile refusals; packaged-runtime verification in-process (TypeScript); shared hash/app-config helpers. The checks themselves (filters, channel, signer, version, runtime/voice/licence, distributable reasons) are unchanged — this is the build-output audit that D10 moves release rules into.
