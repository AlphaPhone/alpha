# scripts/fetch-alpha-os-preset-inputs.py
- Lines: 29 | Kind: script (manual AOSP image tool: fetch pinned Provision source files from googlesource by hash) | Verdict: KEEP + SIMPLIFY
- Covers: downloads (or reuses) the exact AOSP `Provision` source files listed in `android/aosp/branding/provision/source-inputs.json`, verifying URL, size bound and SHA-256, for the guarded Provision staging of the Alpha OS image. Callers: documented in `android/aosp/branding/provision/README.md:38`; listed in `scripts/quint-lib.ts:10` runtime paths and pinned in `specs/quint/application/manifest.json:3992` as a source of the OS branding staging model. No npm/CI caller (AOSP builds are manual).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13,15,18-19,22,24,26,28 | B1 | All safety checks are `assert`, which `python3 -O` strips; this guards downloaded bytes. | Replace with `if not …: raise SystemExit(msg)`. | Low |
| 2 | 17-19 | D9 | Hand-rolled symlink walk up to `output.parent`. | Resolve once and compare `target.resolve()` is under `output.resolve()`. | Low |
| 3 | 29 | B5 | Prints a `state` JSON line nobody parses. | Plain message. | — |

## Proposed end state
Same 25-line fetcher with real exceptions. Keep with the AOSP image tooling; the Quint source pin stays valid.
