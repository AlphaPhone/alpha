# scripts/deliver-app-update.ts
- Lines: 236 | Kind: script (release: publish admitted APK + stable manifest to GitHub releases with anonymous readback) | Verdict: KEEP + SIMPLIFY
- Covers: publish ordering for OTA app updates: APK upload, anonymous HTTPS readback by digest, version-floor and flavour/signer checks, race detection, then manifest pointer move and readback. Callers: `.github/workflows/publish-qualified-app-update.yml:146-150`; `scripts/app-update-candidate.ts:11` (imports `publicObject`); README; tests `deliver-app-update`, `qualified-app-update`; Quint `app-update-candidate.mjs`, `protected-app-update-promotion.mjs`, `services/manifest.json`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 113-133,157,185 | A1? / owner | `checkLegacyFloor` reads the old `app-stable` tag (`LEGACY_APP_UPDATE_TAG`) so a new versionCode never collides with APKs already published there. This protects phones in the field, not app data. | Keep until the owner confirms no phone follows `app-stable` (install-base fact like D17); then delete function + `LEGACY_APP_UPDATE_TAG`. | High if removed wrongly |
| 2 | 178-183 | B4 | `verified` flag can never be false after the loop (attempt 3 re-throws). | Delete the flag and the check. | Low |
| 3 | 44 | C3 | Local `sha`; `updateArtifactDigest` already does SHA-256 for files. | Shared hash helper. | Low |
| 4 | 17-25 | C1 | `UpdateOffer` re-declared (also `app-update-candidate.ts:21`). | Export from `update-channel.ts`. | Low |
| 5 | 91-97 | C3 | `gh()` wrapper; another lives in `app-update-candidate.ts:78`, `owner/gh-readonly.ts`. | One `scripts/lib/gh.ts`. | Low |
| 6 | 209-217 | C3 | Hand-written arg loop. | `node:util parseArgs`. | Low |
| 7 | 48 | D11 | `publicObject` (generic anonymous download) is imported by `app-update-candidate.ts`; it is not delivery-specific. | Move to a shared `update-download.ts` (or `update-artifact.ts`). | Low |
| 8 | wf 146-150 | A8 | Workflow keeps an `if test -f scripts/deliver-app-update.mjs` fallback for a rename that already happened (ci-and-formal). | Delete the fallback in the workflow (owner: oldest signable commit). | Low |

## Proposed end state
~190 lines: same publication ordering and readback, shared hash/gh/args/offer type, no dead `verified` flag. Legacy floor kept until the owner answers.
