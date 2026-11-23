# apps/app/src/browser/development-digests.ts
- Lines: 77 | Role: fake hosted-digest workflow API for development profiles (sources, loops, ticks, results, acks, delegation) and its 15 s scheduler. | Verdict: SIMPLIFY (dev module)
- Importers: 2 (`development-workflows.ts`, `runtime/hosted-digest-ui.tsx`). Text/path pins: `specs/quint/refinement/application/hosted-digest-refresh.mjs`, `test/digest-occurrence-delivery.test.mjs`, browser specs `dev-digest-delegation`, `dev-digest-live`, `dev-digest-schedule`, `digest-execution-migration` (A1), `digest-source-renewal`, `journey-d-digests`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13, 14, 25, 28, 41-45, 50 | B3 (P6) | `check()` (abort + verify + assert + selection) runs on entry, after read, before and after `operate`, and after each source read. | Check at entry and once before commit. | Low |
| 2 | 13, 73 | C3 / C6 | Two inline `alpha.connection.selection.v1` parses. | `readConnectionSelection()`. | Low |
| 3 | 36, 43 | C3 | Result record built twice with the same 12 fields. | `record(loop,source,occurrence,status,output,error)`. | None |
| 4 | 15-16 vs 46-47; 22 vs 50 | D9 | Read paths for sources/loops/results written twice (fast path before the edit and inside it). | One `readOnly(path,state)` used by both. | Low |
| 5 | 12, 72 | B4 | `if(!devSurfacesEnabled)` inside a dev-only module. | Delete behind the dev boundary. | Low |
| 6 | 58 | B1 | `try{…}catch{throw Object.assign(Error('Source access changed.'),{status:409,…})}` hides the specific cause. | Keep (the fake mirrors the agent's 409), comment it. | — |
| 7 | 75 | B1 | Scheduler `catch{}` on tick failures. | Keep with a comment (next tick retries). | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `id()` | helper | 9 | id regexes in `daily.ts`, `calendar.ts` | keep |

## Proposed end state
~65 lines in `dev/`.

## Verification
`test/browser/journey-d-digests.spec.ts`, `dev-digest-*.spec.ts`, Quint `hosted-digest-refresh`.
