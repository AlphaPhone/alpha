# android/aosp/branding/system-entry/README.md
- Lines: 116 | Role: Describes the SystemUI lockscreen "Open Alpha" affordance and shade wordmark patch, how to fetch/prepare/test/apply, the product-overlay merge, and an OS17 device QA episode. | Verdict: SIMPLIFY
- Importers: none (prose). Names `fetch.py`, `prepare.py`, `test_native_plan.py`, `apply.py`, `product-overlay/values/alpha-system-entry.xml`, `apps/app/public/logo-mark.svg`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 89-116 | A8 | "OS17 runtime correction and next image": a record of one physical-QA session (owner enabled fabricated overlay `com.android.shell:AlphaLockscreenShortcuts`, selected Alpha/Camera, `adb ... cmd overlay disable` recipe). History, not behaviour. | Delete the section (or move to a dated QA note under `docs/` if the owner wants it). | None. |
| 2 | 8-14 | A4 / owner question | The affordance targets `AlphaAssistActivity` and requires it enabled + exported (`prepare.py:52-54`); the app ships it `enabled="false" exported="false"` (P-78). On a production image the lockscreen entry is therefore always Hidden, while the overlay presets it at bottom-start. | Owner: either the entry ships with P-78 lifted, or the `bottom_start:alpha_assistant` default (manifest/product-overlay) is removed until then. Record the decision here in one line. | Product behaviour. |
| 3 | 54-58, 81-87 | B5 / T9 | Lists what `test_native_plan.py` checks and the manual pre-delivery checklist; the test is not run by any runner. | Keep a 3-line "Verification" note: tests are manual; image build + device acceptance required. | None. |
| 4 | 26-52 | C3 | Tool discovery and fetch/prepare instructions duplicated in `hidden-navigation-handle/README.md:27` and `core-launcher/README.md`. | After the shared packet tool exists (see `apply.py.md`), document it once in `android/aosp/branding/README.md` and link. | None. |

## Local types and helpers
None.

## Proposed end state
~55 lines: what the patch adds, product-overlay merge rule, how to reproduce/apply (pointing to the shared tool), verification limits.

## Verification
None (prose).
