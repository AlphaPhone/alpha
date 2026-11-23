# test/deliver-app-update.test.mjs
- Lines: 208 | Kind: tooling (imports `deliver`, `publicObject` from `scripts/deliver-app-update.ts`; temp dir; fake `gh` run port and fake anonymous-read port; `publicObject` with a fake fetcher) | Verdict: KEEP (MOVE to `test/tooling/release-signing.test.ts`)
- Covers: stable app-update publication proves anonymous APK bytes before uploading and reading back the manifest; the retired `app-stable` channel's versions stay reserved as a floor and its pointer cannot be republished; private repo, wrong bytes and pointer races refuse; no regression, mutation or flavour/signer change; final inventory rechecks; public transport hashes, bounds bodies and refuses credential/plaintext redirects. Duplicates: `test/qualified-app-update.test.mjs` (same script family, the candidate side), `specs/quint/refinement/services/app-update-candidate.mjs` and `protected-app-update-promotion.mjs` (Quint replays importing the script). Callers/importers: `npm test` glob; the script is used by `.github/workflows/publish-qualified-app-update.yml`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 82-188 | — | Real publisher logic under injected ports; protects what reaches installed phones. Keep. | Keep. | — |
| 2 | 11, 92-103 | A1? | `LEGACY_APP_UPDATE_TAG` (`app-stable`) floor: not app-data legacy; it stops a reused version code reaching phones that followed the old channel. Same class as D17 (device facts). | Keep; owner question whether any phone still follows `app-stable`. | Medium |
| 3 | 131-187 | T3 | Several tests monkey-patch `f.ports.run` with nested wrappers (lines 181-184 double-wrap). | Give `fixture()` options for "existing assets" and "inventory after readback" instead of re-wrapping. | Low |
| 4 | 12 | C6 | Repository URL literal duplicated from `scripts/update-channel.ts`. | Import `appUpdateManifestUrl`. | Low |

## Proposed end state
Moves into `test/tooling/release-signing.test.ts` with `qualified-app-update`. Run when `scripts/deliver-app-update.ts`,
`scripts/update-channel.ts`, `scripts/app-update-candidate.ts` or `publish-qualified-app-update.yml` change.
