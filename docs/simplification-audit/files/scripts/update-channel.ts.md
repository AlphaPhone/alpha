# scripts/update-channel.ts
- Lines: 78 | Kind: release script module (update channel: build input, APK metadata reader, constants) | Verdict: KEEP, light SIMPLIFY
- Covers: decides whether a build is public or private-QA, reads the private signed manifest URL from a 0600 owner file outside the checkout (never echoing it), and reads/validates the channel back from compiled APK metadata. Duplicates: `interface UpdateOffer` twins elsewhere are not here; `digest` (line 18) is a C3 twin. Callers/importers: `build-android.ts`, `build-archive.ts`, `verify-apks.ts`, `update-apk-admission.ts`, `app-update-candidate.ts`, `deliver-app-update.ts`, `publish-update-manifest.ts`, `audit-production-bundle.ts`, `.github/workflows/release-cloud-app-signing.yml:117` (dynamic import), `apps/app/src/build-flags.ts` (comment), specs (`services/manifest.json`, `protected-app-update-promotion.mjs`), tests `update-channel.test.mjs`, `update-apk-admission.test.mjs`, `android-build-path.test.mjs`, `settings-truth.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11, 14 | A1? (owner) | `LEGACY_APP_UPDATE_TAG = 'app-stable'`: `deliver-app-update.ts:118-119` still publishes to the old tag and `app-update-candidate.ts:116` checks both. This serves phones installed with the old manifest URL — an install-base fact, not an app-data reader (D17). | Keep; owner question whether any installed build still polls `app-stable`. If not, delete the constant, the second tag in both callers, and the union type on `appUpdateManifestUrl`. | High if wrong: stranded devices stop receiving updates. |
| 2 | 38 | B2 | `typeof process.getuid!=='function'` (Windows guard) in a POSIX-only release path. | Keep as one documented refusal or drop; trivial. | None |
| 3 | 57 | B1 | `catch{throw refused()}` collapses every failure to one message. Deliberate (no private URL bytes in diagnostics). | Keep; add a one-line comment saying so. | None |
| 4 | 49 | C6 | Bucket name `alpha-aosp-lab-20261024-private-apks` hard-coded in a regex. | Move to `app.config.json` (or a named constant) next to `updateManifestUrl`. | Low |
| 5 | 60–65 | B3 | `validateUpdateChannel` structurally validates a value read from `build-config.json` and from APK metadata — both boundaries (files on disk). Correct place. | Keep. | — |
| 6 | 18 | C3 | Local `digest`. | `scripts/lib/hash.ts`. | Low |
| 7 | 27–58 | D8 | Dense one-line conditions (line 45 has 11 comparisons). | Split into named checks (`sameOpenFile(before, after, named)`, `isAdmittedSignedUrl(url)`). | Low |

## Proposed end state
Same API. Private-file checks split into two named predicates, bucket in config, shared hash helper. `LEGACY_APP_UPDATE_TAG` stays until the owner confirms no installed build polls `app-stable`.
