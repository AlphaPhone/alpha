# android/aosp/branding/POWER-INVOCATION.md
- Lines: 21 | Role: design note for the AlphaFrameworkOverlay default-assistant / long-press-Power values | Verdict: SIMPLIFY (correct or merge into README.md)
- Importers: none. git grep `POWER-INVOCATION`: 0 hits outside this file. Text/path pins: none. Behaviour it describes is asserted by `test/aosp-cloud-power-defaults.test.mjs` (overlay `config.xml` values and that `AlphaAssistActivity` stays `exported="false"` + `enabled="false"`).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-12 | A8 / NEW (stale doc) | "The existing exported ACTION_ASSIST activity opens Alpha's assistant surface" — false today: `android/app/src/main/AndroidManifest.xml` declares `AlphaAssistActivity` `android:exported="false" android:enabled="false"` and `test/aosp-cloud-power-defaults.test.mjs:24-30` asserts exactly that (P-78 dormant). With the activity disabled, the overlay's `config_defaultAssistant`/`config_longPressOnPowerBehavior=5` point at a package with no enabled assist entry. | Rewrite the paragraph to the current state (assist entry disabled under P-78) or, after the P-78 decision, delete the note together with the overlay values. Fold the remaining 3-4 true sentences into `README.md` "Reused implementation" table and delete this file. | Low (doc only) |
| 2 | 18-21 | B5 | Manual qualification checklist duplicated in README.md:41-45 style. | Merge into README.md once. | — |

## Local types and helpers
None.

## Proposed end state
Deleted; a two-line "Power/assistant defaults" row in `branding/README.md` stating the overlay values and that the assist entry is disabled pending P-78. 0 lines here.

## Verification
None (documentation). Keep `test/aosp-cloud-power-defaults.test.mjs` green if overlay values change.
