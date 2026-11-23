# android/aosp/branding/hidden-navigation-handle/hidden-navigation-handle.patch
- Lines: 28 | Role: Launcher3 patch overriding `StashedHandleView.draw` to skip drawing the taskbar handle when `config_alpha_home_back_only` is true | Verdict: KEEP (product source) — but not wired into staging
- Importers: `manifest.json:5-6` (name + `patchSha256`, matches: `6417efc1…`), `apply.py`, `prepare.py`, `test_hidden_handle.py`. Text/path pins: `PROVENANCE.json:8` hash; `test_hidden_handle.py:65-66,104` slice the patched source by the comment `'    /** Hide only the taskbar navigation indicator for Alpha;'` (T2) — changing the Javadoc breaks that test.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | NEW (unwired packet) | No script stages or applies this patch (git grep `hidden-navigation-handle`: only its own manifest). `scripts/stage-alpha-os-branding.py` stages only core-launcher's patch; staged images get the transparent SystemUI handle colours but not this Launcher3 change. | Owner decision: wire Launcher3 patches (this and `home-back-keyboard.patch`) into staging (cross-file action X1) or record that they are applied manually. | Medium |
| 2 | 17-18 | — | Javadoc is accurate. | None. | — |

## Local types and helpers
None.

## Proposed end state
Unchanged, 28 lines.

## Verification
Launcher3 compile in an AOSP build with `home-back-keyboard.patch` applied; device check of the handle. Host test `test_hidden_handle.py` is hand-run only.
