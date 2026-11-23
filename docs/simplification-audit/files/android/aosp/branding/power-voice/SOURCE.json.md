# android/aosp/branding/power-voice/SOURCE.json
- Lines: 55 | Role: Provenance list of 9 pinned AOSP source files (URLs + sha256) the power-voice patch was reviewed against. | Verdict: DELETE (with packet, or alone)
- Importers: none (No script, test, workflow, spec or staging step reads any file in `power-voice/` (`git grep power-voice` / `alpha-protected-power-voice` / `requiresAppliedSystemUIPatchSha256`: 0 hits outside the directory; `scripts/stage-alpha-os-branding.py` does not stage it). The packet has no fetch, prepare or apply tool of its own.)

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-55 | B5 | Provenance file no tool reads. Only 2 of the 9 rows (`SearchManagerService.java` 21-25, `AssistManager.java` 6-10) are patched, and their hashes are already `beforeSha256` in `manifest.json:17,22`. The other 7 rows (StatusBarManagerService, CommandQueue, SearchManager, LauncherProxyService, AssistUtils, Launcher3 quickstep manifest, DeviceProvisionedController) are review context. | Delete. If the packet is kept and a fetch step is wanted, point the shared fetch tool (see `system-entry/fetch.py.md`) at `manifest.json` rows. | None. |
| 2 | 2 | B5 | `"atUTC": "2026-10-27T11:33:43.895441+00:00"` timestamp nobody consumes. | Goes with the file. | None. |

## Local types and helpers
None.

## Proposed end state
Deleted (0 lines).

## Verification
None needed.
