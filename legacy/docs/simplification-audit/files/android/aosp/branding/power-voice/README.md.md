# android/aosp/branding/power-voice/README.md
- Lines: 30 | Role: Prose for the protected Power-voice framework patch (SearchManagerService strips the Power marker for non-system callers; SystemUI AssistManager launches `AlphaPowerVoiceActivity`). | Verdict: DELETE with the packet (owner, P-78) / else SIMPLIFY
- Importers: none. No script, test, workflow, spec or staging step reads any file in `power-voice/` (`git grep power-voice` / `alpha-protected-power-voice` / `requiresAppliedSystemUIPatchSha256`: 0 hits outside the directory; `scripts/stage-alpha-os-branding.py` does not stage it). The packet has no fetch, prepare or apply tool of its own.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-30 | A4 / A3 | Whole packet is dormant: The packet only matters if Power long-press reaches `AlphaPowerVoiceActivity`, which ships `android:enabled="false" android:exported="false"` (`android/app/src/main/AndroidManifest.xml:129`) under P-78, while `manifest.json:8-13` requires it `"exported": true`. | If the owner keeps P-78 deferred, delete `power-voice/` (README, SOURCE.json, patch, manifest: 289 lines) together with the app-side dormant code listed in research android.md §3 ("AlphaAssistActivity, AlphaPowerVoiceActivity, ..."). If it is reinstated, keep and fix finding 2-3. | Owner decision. |
| 2 | 15-19, 21-23 | A8 | "The earlier Android services and SystemUI sources compiled on the preserved stallion builder. That result retains its original package..." and "The older d4fbb prototype is not compatible..." narrate history and an unrecorded commit. | Delete both paragraphs; keep one line: "Source-checked only; not compiled or device-qualified" (already in `manifest.json:26-28`). | None. |
| 3 | 9-13, 26-30 | B5 | Acceptance checklist duplicates `manifest.json` (`sourceOnly`, `compiled`, `deviceQualified`) and AGENTS.md evidence classes. | Cut to: what the patch does (3-7), how to apply (`python3 ../system-entry/apply.py <frameworks/base> --manifest ../power-voice/manifest.json`, which works because the manifest has the same shape), and its dependency on the system-entry patch. | None. |

## Local types and helpers
None.

## Proposed end state
Deleted (owner) or ~12 lines: purpose, apply command, dependency.

## Verification
Nothing runs it. If kept: run `system-entry/apply.py --manifest power-voice/manifest.json` (read-only) against a pinned frameworks/base checkout.
