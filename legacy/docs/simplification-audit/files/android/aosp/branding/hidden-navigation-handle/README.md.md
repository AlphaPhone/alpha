# android/aosp/branding/hidden-navigation-handle/README.md
- Lines: 40 | Role: explains the Launcher3 `StashedHandleView.draw` suppression patch and how to prepare/test/apply it | Verdict: SIMPLIFY
- Importers: none. Text/path pins: none.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 30-33 | C5 | Documents a dedicated `apply.py`; `core-launcher/README.md:13` already uses `../system-entry/apply.py --manifest`. | After deleting `apply.py` (see its report), document `python3 ../system-entry/apply.py /path/to/Launcher3 --manifest manifest.json`. | Low |
| 2 | 20-28 | T9 | Tells the reader to run `test_hidden_handle.py`, which no runner executes. | Remove with the test (see its report). | — |
| 3 | 35-40 | B5 | Evidence-class disclaimer and manual checklist duplicated across branding READMEs. | Keep the device checklist (3 lines); drop the disclaimer. | — |
| 4 | — | NEW (unwired packet) | Does not say that no staging script applies this patch (git grep `hidden-navigation-handle`: only its own manifest). | State it, or wire into staging (cross-file action X1). | Medium |

## Local types and helpers
None.

## Proposed end state
~20 lines: what the patch changes (3-13), that it depends on `config_alpha_home_back_only` from `home-back-keyboard.patch`, how it is staged/applied.

## Verification
None (documentation).
