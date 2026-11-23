# android/aosp/branding/power-voice/alpha-protected-power-voice.patch
- Lines: 175 | Role: Reviewed unified diff for frameworks/base: `SearchManagerService.launchAssist` strips `INVOCATION_TYPE_POWER_BUTTON_LONG_PRESS` from non-system callers; `AssistManager.tryStartAlphaPowerVoice` launches the protected Alpha Power component for the selected assistant on an unlocked, provisioned current user. | Verdict: DELETE with packet (owner, P-78) / else KEEP
- Importers: `manifest.json:5-6` (`patch`, `patchSha256` d2ba08c4..., matches the file). No script, test, workflow, spec or staging step reads any file in `power-voice/` (`git grep power-voice` / `alpha-protected-power-voice` / `requiresAppliedSystemUIPatchSha256`: 0 hits outside the directory; `scripts/stage-alpha-os-branding.py` does not stage it). The packet has no fetch, prepare or apply tool of its own. Upstream constants used: `AssistUtils.INVOCATION_TYPE_*`, `R.bool.config_alpha_system_entry_enabled` (added by `system-entry` patch, hence `requiresAppliedSystemUIPatchSha256`).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-175 | A4 | The packet only matters if Power long-press reaches `AlphaPowerVoiceActivity`, which ships `android:enabled="false" android:exported="false"` (`android/app/src/main/AndroidManifest.xml:129`) under P-78, while `manifest.json:8-13` requires it `"exported": true`. The patch is never applied by any script. | Delete with the packet if P-78 stays deferred. | Owner decision. |
| 2 | 31-48 | B1 | `catch (RuntimeException malformedArgs) { forwardedArgs = null; }` around `new Bundle(args)`; the fallback is the specified behaviour (drop caller payload) and is commented. | Keep. | - |
| 3 | 93-98 | C6 | `ALPHA_PACKAGE = "ai.alphacompute.alphaphone"`, `.AlphaAssistActivity` repeated in `system-entry/prepare.py:46-47` (`AlphaSystemEntryPolicy.PACKAGE/ACTIVITY`). | If kept, reference `AlphaSystemEntryPolicy.PACKAGE`/`ACTIVITY` (same SystemUI module, added by the required system-entry patch) instead of new constants; regenerate patch + `manifest.json` hashes. | Low; patch hash changes. |
| 4 | 101-157 | B3 | Unlock / user / assistant checks are done twice (104-121 and again 142-146 right before launch). The second pass is a deliberate re-check after building the intent; it is a check-act-check sandwich with no await in between except `getActivityInfo`. | If kept, drop the second block 142-146 except `ALPHA_ASSIST.equals(getAssistInfo())`. Requires recompilation and device qualification, so only do it when the packet is next touched. | Medium (security-sensitive path). |
| 5 | 153-155 | B1 | `catch (PackageManager.NameNotFoundException | RuntimeException unavailable)` -> ordinary assist; specified fallback, logged. | Keep. | - |

## Local types and helpers
Patch-local: `tryStartAlphaPowerVoice`, `alphaPowerComponentEnabled`, `ALPHA_PACKAGE`/`ALPHA_ASSIST`/`ALPHA_POWER_VOICE`/`ALPHA_POWER_PERMISSION`. Twins: `AlphaSystemEntryPolicy.PACKAGE/ACTIVITY` (`system-entry/prepare.py:46-47`); component name + permission also in `power-voice/manifest.json:9-11`, `scripts/apk.ts:89,145`, `test/apk-alpha-power-policy.test.mjs`.

## Proposed end state
Deleted (owner), or unchanged 175 lines.

## Verification
None in CI. Changing it requires an AOSP SystemUI + services build and device qualification (AGENTS.md evidence classes).
