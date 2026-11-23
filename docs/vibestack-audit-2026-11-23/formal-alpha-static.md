# Alpha port formal coverage, static count (migration 3d7ca972, nothing run)

| area | stories | rules | quint blocks | proof.dfy | conformance drivers | tests | meta.tsx |
|---|---|---|---|---|---|---|---|
| account | 28 | 87 | 87 | 0 | 0 | 4 | 10 |
| assistant | 47 | 104 | 104 | 0 | 0 | 7 | 6 |
| browser | 36 | 112 | 112 | 0 | 0 | 12 | 10 |
| calendar | 43 | 133 | 133 | 0 | 0 | 8 | 7 |
| camera | 50 | 158 | 158 | 0 | 0 | 5 | 6 |
| clock | 34 | 102 | 102 | 0 | 0 | 7 | 13 |
| files | 43 | 89 | 89 | 0 | 0 | 9 | 15 |
| inbox | 31 | 77 | 77 | 0 | 0 | 4 | 6 |
| maps | 33 | 69 | 69 | 0 | 0 | 5 | 9 |
| notes | 44 | 73 | 73 | 0 | 1 | 5 | 8 |
| platform | 26 | 64 | 64 | 0 | 0 | 1 | 0 |
| settings | 22 | 89 | 89 | 0 | 0 | 1 | 5 |
| shell | 26 | 79 | 96 | 0 | 0 | 3 | 9 |
| telephony | 48 | 85 | 85 | 0 | 2 | 5 | 16 |
| voice | 38 | 77 | 77 | 0 | 0 | 4 | 5 |
| workflows | 54 | 165 | 165 | 0 | 7 | 4 | 12 |

- 1,563 rules, every one with a Quint block. shell has 17 more Quint blocks than rules (gen already
  rejects `spec/shell/appInfo.md:9: a quint block must sit under a ### rule`).
- No `*.proof.dfy` beside any area spec and no `apps/app/spec/lock.json`: nothing has been run, so nothing is proved yet in
  the port, and nothing records rules as simulated-only. Legacy had 528 Lemma/Dafny proof files.
- 10 conformance drivers in `apps/app/test/drivers` (workflows 7, telephony 2, notes 1); 13 areas have none.
- `test/bombadil.ts` exists; never run.
- `gen` has never completed, so no Quint block has been typechecked or simulated.
- Correction: proof files are hand-written lemmas for obligations Dafny cannot discharge alone, so
  their absence is not by itself a gap. Whether the 1,563 rules prove is unknown until `gen` and
  `check` run. The missing `spec/lock.json` is a real gap: nothing is accepted and nothing can be
  excused as simulated-only.
