# android/aosp/branding/provision/strings.xml
- Lines: 22 | Role: Provision resource strings for the welcome screen, failure/recovery copy and the AlphaAppearance activity. Staged as `packages/apps/Provision/res/values/alpha.xml`. | Verdict: KEEP (shrinks if AlphaAppearance is deleted)
- Importers: `AlphaWelcome.java` (15 strings), `AlphaAppearance.java` (4 strings: lines 18-21), `stage-alpha-os-branding.py:47-48` (`@string/alpha_name` in manifest), `:130` (staging). `os-provisioning.mjs:85` harvests every `R.string.*` name used in the two Java files and fakes them. `admitted-previous-sources.json:8-10` lists an older hash.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 18-21 | A5 (conditional) | `alpha_wallpaper_preview`, `alpha_apply_wallpaper`, `alpha_wallpaper_applied`, `alpha_wallpaper_failed` serve only the development `AlphaAppearance` activity. | Delete with the activity if the owner drops it. | Owner decision. |
| 2 | 3-17 | - | User-visible copy; all 15 used by AlphaWelcome (checked). | Keep byte-exact. | - |
| 3 | 1-22 | D11 (minor) | Source name `strings.xml`, staged name `alpha.xml`. | Optional rename to `alpha.xml` so source and staged paths match (update `stage-alpha-os-branding.py:130`). | None. |

## Local types and helpers
None.

## Proposed end state
22 lines, or 18 without the AlphaAppearance strings.

## Verification
Quint OSProvisioning (string harvest); Provision build.
