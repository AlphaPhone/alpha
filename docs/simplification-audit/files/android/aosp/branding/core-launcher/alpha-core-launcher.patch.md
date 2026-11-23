# android/aosp/branding/core-launcher/alpha-core-launcher.patch
- Lines: 327 | Role: generated unified diff (output of `prepare.py`) applied to frameworks/base during OS staging: Alpha QS defaults in SystemUI config, FgsManagerController core-launcher hiding, UserTileSpecRepository migration commit, DefaultPermissionGrantPolicy shared-storage default, plus the three new policy Java files | Verdict: KEEP (generated artifact; edit only via prepare.py)
- Importers: `scripts/stage-alpha-os-branding.py:50-78` (`core_policy_plan`: checks hash, header scope, applies in scratch); `specs/quint/refinement/application/os-defaults.mjs:148,155,159,162` (hash + slices `grantAlphaSharedStorageDefault(` method text out of the patch — T2/T10); `test_policy.py:44,189-219`; `core-launcher/README.md:13` via `system-entry/apply.py --manifest`. Text/path pins: `manifest.json:6-7` (`patch`, `patchSha256`).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 18-32, 124-183, 233-248 | C6 | The three policy Java files are embedded verbatim (new-file hunks) in addition to living beside the patch; both copies are hash-pinned in `manifest.json`. Inherent to shipping one patch. | None; never hand-edit either copy — regenerate with `prepare.py`. | — |
| 2 | whole | NEW (blank-context rewrite) | `prepare.py:220` rewrites `' \n'` context lines to `'\n'` to survive whitespace normalisation, whereas the sibling packets use `.gitattributes *.patch -whitespace` (`hidden-navigation-handle/.gitattributes`, `system-entry/.gitattributes`). | Add a `branding/.gitattributes` with `*.patch -whitespace` and drop the rewrite in prepare.py (requires regenerating the patch + manifest hash). Optional. | Low |
| 3 | 3-16 | A4 / owner | SystemUI default QS layouts start with `custom(ai.alphacompute.alphaphone/.AlphaQuickSettingsTile)`; that service is disabled in the app manifest (P-78). | See AlphaQsDefaultsPolicy finding 2. | Medium |

## Local types and helpers
None (generated).

## Proposed end state
Unchanged (327 lines) unless prepare.py inputs change.

## Verification
`node --test test/quint-os-application-refinement.test.mjs`; `python3 test/aosp-fresh-presets.test.py` (hand-run; drives `stage.build_plan` with `core_baseline`).
