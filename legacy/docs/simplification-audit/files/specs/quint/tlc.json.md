# specs/quint/tlc.json
- Lines: 5 | Kind: model-checker config (TLC backend options: 2 workers, 2 GB heap, 16 MB stack) | Verdict: KEEP
- Covers: JVM/TLC settings passed to every `quint verify`. Duplicates: none. Callers: `scripts/check-quint.ts:40` (input hash list) and `:144` (`--tlc-config=specs/quint/tlc.json` on `verify`), `scripts/ci/check-changed-models.ts:22` (checker input set), `test/quint-checker.test.mjs:88` (writes a stub copy in a temp tree), plus legacy users `specs/quint/legacy/check-view-refresh.mjs:34,115`, `specs/quint/legacy/core/check-configurations.mjs:37`, `specs/quint/legacy/README.md:70-71` (go away with `specs/quint/legacy`, P6).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2 | — | `"workers": "2"` is a string; Quint passes it through as a CLI value, so it works. | None. | None |
| 2 | — | P1 | Listed as a checker input in both `check-quint.ts` and `check-changed-models.ts`; a change to it correctly invalidates all models. Keep it in the Quint lane's path filter. | None. | None |

## Proposed end state
Unchanged. Survives the legacy retirement because the live `check-quint.ts verify` path uses it.
