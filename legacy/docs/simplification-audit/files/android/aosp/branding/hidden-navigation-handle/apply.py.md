# android/aosp/branding/hidden-navigation-handle/apply.py
- Lines: 45 | Role: read-only (or `--apply`) admission of the hidden-handle patch against a Launcher3 checkout: revision, patch hash, required resource flag, file hashes, already-applied detection | Verdict: DELETE (use `system-entry/apply.py --manifest`)
- Importers: none; documented in `README.md:30-33`. git grep `hidden-navigation-handle/apply`: 0. Reads `manifest.json` (`revision`, `patch`, `patchSha256`, `requiredExistingResource`, `files`).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-45 | C5 | Near-copy of `system-entry/apply.py` (revision check, patch digest, symlink walk, before/after state, partial-application refusal, `git apply --check` / `--apply`, same JSON states `ALREADY_APPLIED_EXACTLY` / `APPLIED_SOURCE_ONLY` / `ADMITTED_NOT_APPLIED`). `system-entry/apply.py` already takes `--manifest`, and core-launcher uses it that way (`core-launcher/README.md:13`). The only extra is lines 17-24 (`requiredExistingResource` bool check). | Delete this file; either add an optional `requiredExistingResource` check (8 lines) to `system-entry/apply.py`, or drop the check (git apply would still succeed without the flag, but the build fails at `R.bool.config_alpha_home_back_only` — compile is the real gate). Update README.md:30-33. −45 lines (+≤8 in system-entry). | Low |
| 2 | 13 | C3 | `digest = lambda value: hashlib.sha256(value).hexdigest()` | Goes with the file. | — |
| 3 | 14, 16 | B1/D8 | Bare `assert` without messages for revision/patch digest; `python -O` disables all checks. | Moot after deletion (system-entry/apply.py has the same `assert` style — note for its own report). | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `digest` | helper | 13 | `system-entry/apply.py:19`, `core-launcher/prepare.py:16 sha`, `scripts/stage-alpha-os-branding.py digest` | shared branding Python helper |
| symlink walk | helper | 19-21, 30-32 | `system-entry/apply.py:30-33`, `hidden-navigation-handle/prepare.py:20-22,34-36`, `system-entry/fetch.py:22-25` | shared helper `assert_no_symlink(root, relative)` |

## Proposed end state
Deleted.

## Verification
Run `python3 ../system-entry/apply.py <Launcher3 checkout> --manifest manifest.json` against a pinned Launcher3 checkout (manual; no CI runs either tool).
