# test/support/strip-types.mjs
- Lines: 12 | Kind: transplant support helper | Verdict: KEEP for now, CONSOLIDATE, then shrink with T2/T10
- Covers: TypeScript stripping for sources sliced as text: Node's position-preserving `stripTypeScriptTypes`, falling back to esbuild for parameter properties/enums. Duplicates: `test/fixtures/ts-source.mjs` is the same function (differs only in formatting and a comment; 5 importers). Callers/importers: 217 files (`git grep support/strip-types`): 169 under `test/`, 38 under `specs/` (Quint refinement harnesses), 10 under `scripts/` (`scripts/test-*.ts`, `scripts/fixtures/*`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-12 | C3 | Twin of `test/fixtures/ts-source.mjs`. | Keep this one; repoint the 5 `ts-source.mjs` importers; delete the twin. | none |
| 2 | 6-11 | T2, T10 | Exists only to evaluate text slices of product files. Each test or harness that is ported to `import()` the real module (Node strips types; `tsx`/esbuild bundles handle the rest) drops its import. | Remove importers as their T2/T10 verdicts land; delete the helper when the count reaches zero. | none |
| 3 | — | structure | `specs/` importing `test/support` inverts the dependency (research: 134 spec files import `test/`). | If any refinement harness still needs it after porting, move it to `specs/quint/refinement/support/`. | low |

## Proposed end state
One copy. After the transplant deletions in `test/` and the harness ports in `specs/quint/refinement`, the expected
remaining users are zero; if a few harnesses still need it, it lives under `specs/quint/refinement/support/`
and `test/` no longer has it.
