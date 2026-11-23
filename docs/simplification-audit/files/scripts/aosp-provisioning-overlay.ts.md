# scripts/aosp-provisioning-overlay.ts
- Lines: 43 | Kind: script helper (AOSP staging: launcher provisioning overlay with Alpha's Autofill and all-files requirements) | Verdict: KEEP, SIMPLIFY
- Covers: requires one Autofill service and `MANAGE_EXTERNAL_STORAGE` in the APK manifest dump, patches the shared provisioning README, writes the overlay files. Duplicates: none. Callers/importers: `scripts/stage-aosp.ts:14`; `test/aosp-provisioning-overlay.test.mjs` (unit on synthetic xmltree).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5 | A7 | `manifestComponents` re-export has no importer (git grep). | Delete. | None |
| 2 | 23-31 | D14 | Patches upstream's README text by string replace and throws if upstream wording changes: text-coupled to the vendor module. | Upstream follow-up: let `renderProvisioningOverlay` accept extra README lines; then drop the replace. | Low |
| 3 | 39 | — | `flag:'wx'` refuses to overwrite: staging output is a new directory by contract. | Keep. | — |

## Proposed end state
~35 lines; once upstream accepts extra notes, the README patch disappears.
