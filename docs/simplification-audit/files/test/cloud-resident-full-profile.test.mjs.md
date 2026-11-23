# test/cloud-resident-full-profile.test.mjs
- Lines: 130 | Kind: integration (dev Cloud resident host through the transplant fixture with a recording launcher; case 6 runs the pinned SDK plugin collector under Bun via `test/fixtures/cloud-plugin-selection.mjs`) | Verdict: MERGE into `test/tooling/cloud-resident-host.test.mjs`
- Covers: the explicit `full` Cloud profile enables the personal-assistant plugin without inherited lean or direct-provider authority; the omitted option keeps the lean contract; full mode refuses an assistant opt-out or unset choice without rewriting the profile; an unknown mode fails before creating state; the real collector selects the assistant in full and withholds it in lean/store. Duplicates: `cloud-resident-embedding-route.test.mjs` (fixture, skip guard, launcher), `cloud-resident-authority.test.mjs` case 7 (profile mode forwarding), `cloud-resident-host.test.mjs`. Callers/importers: `npm test` glob; imports `fixtures/product-character-host.mjs`, `fixtures/cloud-plugin-selection.mjs` (only importer: this file — survives with the merge).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 102-110 | A7 | `collect()` is defined and never called; the case spawns the collector again inline at 115. | Delete `collect`. | None |
| 2 | 50-87 | T4 | Opt-out and unset-choice refusals are two near-identical cases. | One parameterised case. | None |
| 3 | 6 | T2 | Same vm-transplant fixture as the sibling files. | Import `scripts/cloud-resident-host.ts` directly. | Low |
| 4 | 90 | C3 | Third copy of the skip guard. | One copy. | None |
| 5 | 115 | T8 | Collector spawn has a 60 s timeout with a comment that a cold SDK can need more than 20 s. | Keep; it is real work, prepared-SDK lane only. | Low |

## Proposed end state
Four cases in the merged tooling file: full vs lean environment, refusal of saved opt-out/unset (one loop), unknown mode creates nothing, real collector selection (prepared-SDK lane).
