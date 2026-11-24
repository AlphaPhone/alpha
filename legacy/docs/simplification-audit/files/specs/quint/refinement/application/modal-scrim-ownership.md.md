# specs/quint/refinement/application/modal-scrim-ownership.md
- Lines: 45 | Kind: harness documentation | Verdict: MERGE (trimmed) into the header comment of `modal-scrim-ownership.mjs`
- Covers: what the ModalScrimOwnership replay runs and which app surfaces use the modal helpers. Duplicates: harness `assumptions`. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-10 | A8 | "The bounded red replay… A captured mouse release still reached the inert scrim…" narrates the pre-fix failures. | Delete. | — |
| 2 | 12-25 | — | Current contract (exact scrim element + press, inert acquisition retires it, compatibility click checks pointer ID). | Keep 3-4 lines. | — |
| 3 | 27-40 | — | "App entry points" lists which apps use the inline modal helper — product documentation that will rot. | Drop; grep is authoritative. | — |

## Proposed end state
Short header comment; file deleted.
