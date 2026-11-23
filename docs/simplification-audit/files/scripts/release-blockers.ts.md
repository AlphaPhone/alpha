# scripts/release-blockers.ts
- Lines: 45 | Kind: release policy library | Verdict: KEEP, SIMPLIFY
- Covers: Alpha's policy binding of upstream `apkReleaseBlockers` (signer from `android/release-signer.json`, Cartesia cloud voice, only the proprietary-font check may block). Duplicates: none. Callers/importers: `provision-unit.ts` (→ `publish-update-manifest`, `record-release`), `stage-aosp.ts`, `qualify-head.ts` (to be deleted); Quint `services/pilot-update.mjs` (as source); tests `aosp-release-signing.test.mjs`, `font-license.test.mjs`, `licenses.test.mjs`, `pilot-units.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 44 | D10 | Removes one blocker by exact message text (`'unqualified on-device voice (device qualification pending)'`). A wording change upstream silently re-enables it. | Upstream follow-up: an option (`deviceQualificationBlocks: false`) instead of string filtering. | low |
| 2 | 29-33 | B2 | Cast re-typing an upstream `.mjs` function. | Upstream `.d.ts`. | none |
| 3 | 22-28 | — | `releaseSigner`, `image` options are passed through untouched; confirm a caller uses them (`stage-aosp.ts` uses `image`). | Keep what is used. | none |

## Proposed end state
~25 lines: one function binding policy, no text filter once upstream offers the option. Tests that only assert which strings it filters (T3) fold into the verify-apks integration test.
