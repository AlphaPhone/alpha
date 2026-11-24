# scripts/verify-upstream.ts
- Lines: 77 | Kind: script (verifies `vendor/eliza` matches `upstream.lock.json`; checks the staged runtime stamp; reports/records develop reachability) | Verdict: KEEP, light SIMPLIFY
- Covers: the pinned upstream is authentic and the staged agent was prepared from it; reachability of the pin from upstream `develop` is reported (warning/fail by mode). Duplicates: stamp hash check (54–62) duplicates `verify-packaged-runtime.py:75-79` (that one omits `copySha256`). Callers: `package.json:27 upstream:verify` (alias not used by CI), `.github/workflows/browser.yml:107` (`--reachability-only`), `build-android.ts:299`, message in `pinned-upstream-source.ts:81`; tests `upstream-reachability.test.mjs`, `ci-required-checks.test.mjs` (text).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 54–62 | pattern 2.9, C3 | Stamp compared to hashes of three scripts; the same rule lives in Python. | One `checkStagedStamp(root, pin)` in the TS packaged-runtime module, used by both. | Medium (same provenance decision as the Python verifier). |
| 2 | 15–17, 21 | C3 | `upstream.lock.json` parsed twice. | `readUpstreamPin()` once. | None |
| 3 | 19–47 | — | `--record-reachability` is an owner-only networked `gh api` refresh; CI never runs it. | Keep (documented in the error message of `pinned-upstream-source.ts`). Optional: move to `scripts/owner/`. | None |
| 4 | 52–53 | C3 | Local hash helper. | Shared. | None |
| 5 | 27 | — | `upstream:verify` npm alias unused by CI. | Keep for humans; harmless. | None |

## Proposed end state
~60 lines: verify pin, call the shared staged-stamp check, then reachability. The record-refresh branch stays (or moves to `scripts/owner/record-reachability.ts`).
