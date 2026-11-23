# scripts/owner/VerifyApkRotation.java
- Lines: 158 | Kind: release tooling (single-file Java program; signing-certificate rotation verifier) | Verdict: KEEP (D17: APK signing-rotation is kept), MOVE out of `owner/`
- Covers: verifies a reviewed two-certificate lineage (digest, order, capabilities), a signed v3-only rotation output across API 29-37, and an installed-to-replacement pilot migration on one API. Duplicates: helpers twin `InspectUpdateApk.java:16-30`. Callers/importers: `.github/workflows/release-cloud-app-signing.yml:166` (`--reviewed-lineage`), `scripts/sign-release-apks.ts:207` (`--signed-output`), `scripts/owner/pilot-rotation.ts:8` (pilot migration mode); Quint `specs/quint/refinement/services/pilot-update.mjs:14` (path pin), `specs/quint/services/manifest.json`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | path | D11 | Release workflow and signing script depend on a file in the owner incident folder. | Move to `scripts/apk/` with `InspectUpdateApk.java`; update the workflow, `sign-release-apks.ts`, `pilot-rotation.ts`, Quint `pilot-update.mjs` pin and manifest in one change. | Low |
| 2 | 122-157 | D9 | Three modes selected by positional `args[0]` and argument counts, with a trailing-flag special case. | Keep the modes; a `switch` on the first argument with one method per mode reads better. | None |
| 3 | 18-40 | C3 | Duplicate helpers (see `InspectUpdateApk.java`). | Optional merge into one tool. | Low |

## Proposed end state
Same verifier in `scripts/apk/`, three explicit subcommands. No behaviour change: release signing and pilot rotation are D17-kept and Quint-modelled.
