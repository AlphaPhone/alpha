# scripts/ci/resident_absence.py
- Lines: 49 | Kind: CI library (prove no resident agent runs on the emulator) | Verdict: KEEP, SIMPLIFY
- Covers: checks `/proc` visibility for the shell identity, scans every process `cmdline` (base64 over adb), the activity service list and `/proc/net/unix` for the resident runtime, service and abstract socket; raises on any sign of a running agent. Duplicates: none. Callers/importers: `pending-recovery-ui.py:5`, `resident-native.py:5` (both call `assert_no_resident(run)` and ignore the return value).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 49 | B5 | Returns a dict with three SHA-256 digests of inventories and a scope string; both callers discard it. | Return `None`. | None. |
| 2 | 11-26 | B3 | Detailed `/proc` mount parsing to prove visibility. It is the reason a "no process found" result is trustworthy on an unknown image; keep but it is the most elaborate part. | Keep. | — |
| 3 | all | — | Belongs in the shared `resident_emulator.py`. | Merge into it. | None. |

## Proposed end state
A ~40-line `assert_no_resident(run)` inside `resident_emulator.py`.
