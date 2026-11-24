# android/aosp/branding/system-entry/apply.py
- Lines: 47 | Role: Read-only admission (revision, patch hash, header scope, per-file before/after hashes, no symlinks, no partial state) and optional `git apply` for a manifest-described patch. | Verdict: MERGE into a shared `android/aosp/branding/packet.py`
- Importers: CLI only. `core-launcher/README.md:13` documents `python3 ../system-entry/apply.py ... --manifest manifest.json` (so it already serves two packets); `power-voice/manifest.json` has the same shape. No test runs it.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-47 | C3 / C5 | Near-duplicate of `hidden-navigation-handle/apply.py:1-45` (same revision check, patch hash, symlink walk, before/after state, partial-application refusal, apply + post-check) and of `stage-alpha-os-branding.py:58-64` (`headers == expected` scope check, `core_policy_plan`). | Create `android/aosp/branding/packet.py` with `admit(source_root, manifest_path, apply=False)` (this file's body as a function, plus an optional `requiredExistingResource` hook from hidden-navigation-handle). Make `stage-alpha-os-branding.py` call its header-scope check. Delete both per-packet `apply.py`. | Low; CLI output JSON shape (`state`, `mutated`) should be kept for anyone scripting it (no script does: grep 0). |
| 2 | 15, 17, 20, ... | D8 | Validation via bare `assert` (disabled under `python -O`). | Use `raise SystemExit(msg)` in the shared tool. | None. |
| 3 | 17 | B3 | Patch filename safety check on our own committed manifest. | Keep a single `Path(manifest['patch']).name == manifest['patch']` check in the shared tool. | None. |

## Local types and helpers
| `digest` | helper (lambda) | 19 | ~40 Python SHA-256 copies (research C3); here: `prepare.py:18 sha`, `fetch.py` inline, `hidden-navigation-handle/apply.py:13`, `stage-alpha-os-branding.py:9`, `test_native_plan.py:15` | `packet.py` |
| symlink-safe path walk | helper (inline) | 30-33 | `fetch.py:22-25`, `stage-alpha-os-branding.py:18-25 safe()`, `hidden-navigation-handle/apply.py:20-21,29-31`, `fetch-alpha-os-preset-inputs.py:17-19` | `packet.py safe(root, rel)` |

## Proposed end state
Deleted here; ~45 lines in shared `packet.py` serving system-entry, core-launcher, hidden-navigation-handle and (if kept) power-voice.

## Verification
Read-only run of the shared tool against a pinned frameworks/base checkout for each packet; Quint `OSSourceStaging` if the stage script imports it.
