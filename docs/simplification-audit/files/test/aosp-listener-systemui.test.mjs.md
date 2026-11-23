# test/aosp-listener-systemui.test.mjs
- Lines: 78 | Kind: tooling (test 3: CLI over vendor fixture), upstream data check (test 1), permanently skipped (test 2) | Verdict: MERGE test 3 into `test/tooling/aosp.test.ts`; DELETE tests 1 and 2
- Covers: the reviewed SystemUI microphone-ops patch applies to its baseline (test 1, vendor data), exact-source overlay (test 2, never runs), and the Alpha CLI `scripts/aosp-listener-systemui.ts --chip/--assist` producing verified overlays and refusing an existing output (test 3). Duplicates: upstream `packages/os/scripts/android/sense.test.mjs` (run here by `test/aosp-listener.test.mjs`) tests the same shared `sense-systemui.mjs`. Callers/importers: `npm test`; imports `scripts/aosp-listener-systemui.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13-43 | T5 | Verifies a vendor patch file against a vendor manifest and vendor lock; nothing Alpha-owned. | Delete (upstream owns its patch). | none |
| 2 | 45-58 | T9 | Skipped unless `ALPHA_SYSTEMUI_TEST_SOURCE` is set; `git grep` finds no setter (research `tests-host.md:278`). Never runs. | Delete. | none |
| 3 | 61-78 | - | Real CLI execution over a copied vendor fixture with a verify step: keep. | Move. | none |
| 4 | 66-73 | B4 | Loop is over `['chip','assist']` but branches on `bundle==='ops'` twice: dead branches. | Drop the `ops` branches. | none |

## Proposed end state
One test in `test/tooling/aosp.test.ts`: the CLI writes and verifies the chip and assist overlays and refuses an existing
output. About 15 lines.
