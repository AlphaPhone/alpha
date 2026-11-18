# specs/quint/services/PersonalAssistantScheduledTaskCustody.qnt
- Lines: 151 | Kind: Quint model of upstream code (services family, live; 7 tests) | Verdict: KEEP; gate on upstream change; upstream follow-up
- Covers: upstream personal-assistant dossier activity admission and scheduling SQL store: one managed claim per day, conditional writes use the claim snapshot, metadata/definition revisions fence a stale egress. All 8 sources are `vendor/eliza/plugins/plugin-personal-assistant/**` and `plugin-scheduling/**`; all exist. Duplicates: `LifeOpsScheduledTaskRoute.qnt` (same scheduled-task route, another chunk) shares the fixture `test/fixtures/lifeops-scheduled-task-route.mjs`. Callers/importers: manifest; harness `refinement/services/personal-assistant-scheduled-task-custody.mjs` (runs the upstream route through the fixture; no slicing); wrapper `test/quint-personal-assistant-scheduled-task-custody.test.mjs` + aggregate (T4).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1 | A8 | Header "at the b181 pin" names a historical upstream revision; the manifest sources track the current pin. | Drop the revision from the comment. | None |
| 2 | 123-127, 141-143 | — | `ExactOccurrenceEgress` is deliberately outside `safety`; `occurrenceEgressGapWithSqlWriteFenceTest` shows an upstream gap closed by the SQL write fence. Correct but undocumented in the manifest. | One-line comment that it is a known upstream gap. | None |
| 3 | sources | ci §2.9 | Upstream-only; runs on every PR. | Gate on `upstream.lock.json`; consider merging with `LifeOpsScheduledTaskRoute` (same fixture, same store) when either changes. | Low |
| 4 | — | T4 | Wrapper + aggregate. | One runner. | Low |

## Proposed end state
Model unchanged apart from the header; runs only on upstream pin changes; listed as an upstream follow-up (D14).
