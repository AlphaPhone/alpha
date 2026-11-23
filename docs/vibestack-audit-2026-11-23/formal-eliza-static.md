# eliza vibestack formal coverage, static count (vibestack-dp 769b4f00d; nothing run)

| package | stories | rules | quint blocks | proof.dfy | conformance drivers | test/bombadil.ts |
|---|---|---|---|---|---|---|
| agent | 84 | 345 | 345 | 9 | 12 | no |
| assistant | 24 | 70 | 70 | 7 | 0 | no |
| browser | 16 | 41 | 41 | 1 | 0 | no |
| calendar | 23 | 66 | 66 | 2 | 3 | no |
| cloud | 93 | 368 | 368 | 16 | 15 | yes |
| core | 208 | 546 | 546 | 129 | 5 | no |
| files | 22 | 54 | 54 | 1 | 0 | no |
| inbox | 13 | 35 | 35 | 1 | 5 | no |
| localInference | 6 | 36 | 36 | 1 | 0 | no |
| maps | 16 | 29 | 29 | 0 | 10 | no |
| notes | 16 | 36 | 36 | 0 | 0 | no |
| os | 199 | 704 | 704 | 7 | 22 | no |
| workflow | 18 | 34 | 34 | 4 | 8 | no |

- 2,364 rules, each with a Quint block.
- `spec/lock.json` on origin/vibestack (f3a693017) and on vibestack-dp is the tool repository's
  example ledger: its `specs` are `spec/app/{echo,tally,words,index}.md` and `spec/index.md`, its one
  contract is `apps/app/src/greeting.ts`, and none of those are Eliza's. No Eliza story, rule or
  contract has an accepted review record. SPEC.md says `pnpm accept` records "everything or nothing:
  only when every other stage passes", so either the full check has never passed with an accept, or
  accept was never run. `unproved` is empty, so no obligation is excused as simulated-only: the
  `proof` stage must prove every unit for `check` to pass.
- Proof files are only needed where Dafny wants help, so their count is not proof coverage. What is
  proved is known only from a `pnpm check` run. The same correction applies to the alpha count in
  `formal-alpha-static.md`: "no proof files" there means no hand-written lemmas, not "unproved".
- Bombadil (`explore`) has a properties file only in `packages/cloud`. Packages without a page have
  nothing to explore; `packages/ui` and `packages/agent` client surfaces have no explore target.
- No conformance drivers in assistant, browser, files, localInference, notes.
- LemmaScript is not a separate gate in this stack: `vibestack/gen.ts` emits TypeScript annotated for
  LemmaScript, which produces the Dafny the `proof` stage checks. VibeLang is the `types` stage.
- To settle: run `pnpm check` at the code-complete SHA and read each stage's line per package
  (model, replay, types, proof, tests, traces, explore, review).
