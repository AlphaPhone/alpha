# android/aosp/branding/system-entry/alpha-native-system-entry.patch
- Lines: 374 | Role: Reviewed, generated unified diff for frameworks/base SystemUI: lockscreen quick-affordance "Open Alpha" (`AlphaAssistantQuickAffordanceConfig.kt`, `AlphaSystemEntryPolicy.java`, module registration), decorative shade wordmark (`AlphaShadeWordmarkView/Policy.java`, Compose + XML header/constraint edits), `alpha_system_entry.xml` resources (default off) and `ic_alpha_system_mark.xml`. | Verdict: KEEP (generated; fix at source in prepare.py)
- Importers: `manifest.json:5-6` (hash 58e75d2a..., matches); `apply.py` (applies it); `test_native_plan.py:22-30`; `power-voice/manifest.json:7` and `PROVENANCE.json:10,59` repeat its hash. `.gitattributes` keeps whitespace. Not staged by `stage-alpha-os-branding.py` (applied separately via `apply.py`).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-374 | C7 | Every line is produced by `prepare.py` (which embeds the new files as Python string literals, ~280 of its 394 lines). The same code thus exists twice in the repo; review happens on the patch, edits happen in Python strings. | See prepare.py report: move new-file bodies to real files under `system-entry/src/` and let prepare.py read them; keep the patch as the reviewed, applied artifact. | Low for the move; patch bytes must stay identical (prepare.py asserts the hash). |
| 2 | ~150-175 (AlphaAssistantQuickAffordanceConfig.available) | B3 / B4 | Mirrors prepare.py 101-117: `config_alpha_system_entry_enabled` and `isUserSwitching` read twice; `user != userTracker.userId` right after `val user = userTracker.userId`. | Fix in prepare.py, regenerate. Any change to generated source text changes the patch bytes, so `alpha-native-system-entry.patch`, `manifest.json` (`patchSha256` + `afterSha256` of the touched file), `PROVENANCE.json:10,59` (if kept) and `power-voice/manifest.json:7` (`requiresAppliedSystemUIPatchSha256`) must be regenerated/updated together. | Medium: needs SystemUI recompilation and device check (AGENTS.md evidence classes). |
| 3 | ~300-330 (AlphaShadeWordmarkView.onDraw) | B4 / D10 | `AlphaShadeWordmarkPolicy.fits(..., false)` always passes `collision=false`; the collision is checked separately by `collides(...)`. | Drop the parameter in prepare.py, regenerate. Any change to generated source text changes the patch bytes, so `alpha-native-system-entry.patch`, `manifest.json` (`patchSha256` + `afterSha256` of the touched file), `PROVENANCE.json:10,59` (if kept) and `power-voice/manifest.json:7` (`requiresAppliedSystemUIPatchSha256`) must be regenerated/updated together. | Medium (recompile). |

## Local types and helpers
Patch-local Java/Kotlin: `AlphaSystemEntryPolicy` (PACKAGE/ACTIVITY twins in `power-voice` patch 93-97 and `provision/AlphaWelcome.java:68`), `AlphaShadeWordmarkPolicy`, `AlphaShadeWordmarkView`, `AlphaAssistantQuickAffordanceConfig`.

## Proposed end state
Unchanged until prepare.py fixes are regenerated; ~370 lines.

## Verification
Manual `test_native_plan.py`; `apply.py` admission against a pinned checkout; full SystemUI build and device acceptance before image delivery.
