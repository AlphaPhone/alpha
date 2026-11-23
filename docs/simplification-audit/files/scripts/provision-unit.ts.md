# scripts/provision-unit.ts
- Lines: 289 | Kind: operator tool (manual CLI) + shared release library | Verdict: KEEP, SIMPLIFY (split library from CLI)
- Covers: admits a verify-apks release row for a pilot unit (distributable, signer, flag-off, runtime), cross-checks the APK file itself, installs on a fresh unit, opens the HOME chooser and writes a provisioning record. Duplicates: `interface ApkManifest` also in `qualify-head.ts:83`, `generate-sbom.ts:91`; `adbFor` among 16 adb helpers; sha256 twin `pilot-update.ts:72`. Callers/importers: no npm/CI caller (manual, README describes the pilot flow); library for `pilot-update.ts`, `publish-update-manifest.ts` (→ `deliver-app-update.ts` → publish-qualified-app-update.yml, so `admitUnitApk` is on a CI path), `record-release.ts`, `update-apk-admission.ts`; tests `pilot-units.test.mjs`, `update-apk-admission.test.mjs`; Quint `services/pilot-update.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 38-233 | D1/D11 | A CI-path release library (`admitUnitApk`, `apkContradictions`, `apkRuntimeIdentity`, `packageFacts`, `adbFor`, `deviceFacts`, `PACKAGE`) lives in a manual operator CLI. | Move admission/facts to `scripts/apk.ts` (or `release-admission.ts`); adb helpers to `scripts/lib/adb.ts`; leave the provisioning `main()` here. | medium (many importers) |
| 2 | 56-59 | C1 | Local `ApkManifest` (three copies). | One export from `apk.ts`. | low |
| 3 | 39 | C3 | sha256 helper. | Shared. | none |
| 4 | 181-195 | C3 | `entrySha256` extracts an entry via `unzip` to a temp file; `apk.ts`/`update-artifact.ts` already stream-hash files. | Reuse one APK entry reader. | low |
| 5 | 235-237 | B1 | `sourceCommit` turns a git failure into `null`. | Let it throw (the tool runs from a checkout). | none |
| 6 | 112, 119-120 | B3 | Manifest-level and row-level `testMocks` both checked. | Keep (manifest is an unsigned file, comment explains); fine. | — |
| 7 | 76-99 | C3 | Hand arg parser (8 in scripts). | `node:util parseArgs`, shared with `pilot-update.ts`. | none |

## Proposed end state
`provision-unit.ts` ≈ 80 lines of CLI on top of `apk.ts` (admission and facts) and `lib/adb.ts`. Coverage of `admitUnitApk` comes from `publish-update-manifest`/`record-release` integration tests that run against a fixture `apk-manifest.json`; the unit cases in `pilot-units.test.mjs` for `packageFacts`/`parseUnitArgs` are T3, delete.
