# test/fixtures/resident-java-source-stage.mjs
- Lines: 188 | Kind: integration fixture (temp vendor git repo, spawns the real `scripts/stage-local-agent-sources.ts`, fs fault preload) | Verdict: KEEP
- Covers: staging of the upstream resident-host Java sources into `android/app/build/generated/local-agent`: only an admitted pin (lock + stamp + clean checkout) publishes, publication is transactional (move/publish/restore/manifest faults leave the previous tree or a retained transaction), a changed rewrite anchor is refused, and the manifest records exact source/generated hashes. Duplicates: none. Callers/importers: `test/quint-resident-java-source-stage.test.mjs:7`, `specs/quint/refinement/services/resident-java-source-stage.mjs:6,67` (registered `services/index.mjs:60`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 55-56 | T10 | Relies on the literal `"Eliza agent · Running"` in upstream `ElizaAgentService.java` (present at line 4849) to produce a "changed anchor" generation. The test intentionally exercises the staging script's own rewrite anchor, so the literal is the input under test, but it pins upstream text. | Read the anchor from the staging script's exported rewrite table instead of repeating it. | Low |
| 2 | 82-99 | — | Fault injection via a preload that wraps `fs.renameSync`/`fs.writeFileSync`; real script, real fs. Good. | Keep. | — |
| 3 | 27-32 | C3 | Local `hash`, `write`, `copy`, `git` helpers (shared-helper candidates). | Use `scripts/lib` helpers when they exist. | Low |
| 4 | 7, 20-22 | — | Imports upstream `RESIDENT_HOST_CLASSES` and `android/consumer-host.json` to compute the real file set. Good (not a copied list). | Keep. | — |
| 5 | — | cost | Copies the resident Java tree, three git commits and one spawn per scenario. | None. | — |

## Proposed end state
Unchanged apart from shared helpers and reading the anchor from the script; owned by the `ResidentJavaSourceStage` refinement harness, with the per-model host test folded into the family runner.
