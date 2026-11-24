# specs/quint/application/PreferencesAndPresentationAuditState.qnt
- Lines: 52 | Kind: Quint model (live in manifest; no harness) | Verdict: DELETE
- Covers: Twin of PreferencesAndPresentation adding a one-shade-per-build rule and a draft/selection preservation claim. Duplicates: specs/quint/application/PreferencesAndPresentation.qnt (layout arithmetic, keyboard/rotate/text/wide/theme actions verbatim). Callers/importers: manifest row only (same 9 sources); no harness/test (grep: manifest only)

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-2 | P6/C5 | Self-described "complementary audit scope" twin, unbound to code. | Delete file and row. | L |
| 2 | 29, 37 | B5 | `StatePreserved` is vacuous: no action except `typeDraft` touches `draft`/`selection`, so the layout actions preserve them by construction; it says nothing about the product. | Not carried. | L |
| 3 | 23-27, 32 | - | `OneShade` (native vs browser stand-in shade) is a build-flag fact better checked by the production bundle audit / a browser journey. | Not carried to Quint. | L |

## Proposed end state
Deleted.
