# android/aosp/branding/core-launcher/README.md
- Lines: 17 | Role: describes the core-launcher / QS defaults / shared-storage OS policy packet and how to reproduce it | Verdict: SIMPLIFY
- Importers: none. Text/path pins: none.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 15 | B5 | "Source policy tests do not prove a compiled SystemUI…" — repeated evidence disclaimer (also in four sibling READMEs). | Delete; one copy in `branding/README.md`. | — |
| 2 | 11 | — | Omits that `test_policy.py` exists, needs `.cache/baseline` (from `prepare.py --fetch`) and `kotlinc`, and is not run by CI. | If `test_policy.py` is deleted (see its report) nothing to add; else document the command. | — |
| 3 | 17 | A1 | Paragraph about "Existing installations under the previous package" — tied to `LEGACY_ALPHA` in AlphaQsDefaultsPolicy; delete together when the pre-rename image is retired. | Delete with that migration. | — |

## Local types and helpers
None.

## Proposed end state
~10 lines: what the three policies do (lines 5-7), that staging includes the packet (line 9), the `prepare.py --fetch` and `system-entry/apply.py --manifest` commands.

## Verification
None (documentation).
