# specs/quint/refinement/application/saved-service-read.mjs
- Lines: 182 | Kind: Quint refinement harness, import-based (esbuild bundle of `apps/app/src/runtime/agent-calendar.ts` + `service-read-cache.ts`, written to a temp file, executed via `new Function`) | Verdict: KEEP (SIMPLIFY the evidence ceremony)
- Covers: saved Calendar reads are shown read-only until a live readback; a late cache read never replaces live data; HTTP 403 invalidates other windows; owner/credential/window isolation of the cache; late local completion cannot republish after retirement; mutations refused while showing saved data (live model `SavedServiceRead.qnt`, manifest ~l.3988). Duplicates: agent Calendar Playwright specs cover live reads but not these cache races. Callers/importers: `index.mjs:109`, `test/quint-saved-service-read.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 156-157 | P1, B5 | `sources` includes `specs/quint/refinement/application/index.mjs` and `test/quint-application-refinement.test.mjs`: editing the aggregate (a deletion candidate) invalidates this receipt, and deleting that test will make `captureInputs` fail on a missing file. | Remove both paths. | Medium (will break when the aggregate test is deleted) |
| 2 | 24-34, 159-163, 181 | B5 | onLoad hook re-hashes every file and asserts the compiler read the same bytes; then writes the bundle to `os.tmpdir()` to hash it as a "generated source", then reads it back. | Use `bundledSource()` from `support.mjs` like the sibling harnesses; drop the temp file and the per-file re-hash. | Low |
| 3 | 4 | — | Writes to `os.tmpdir()` rather than `test-results/`. | Goes with #2. | None |
| 4 | 71-80 | — | Seeds the cache by running a real controller refresh instead of fabricating a document: good practice. | Keep. | — |
| 5 | — | — | Product path confirmed: `agent-calendar.ts` is the kept Calendar sync path (D4). | Keep. | — |

## Proposed end state
~140 lines: `bundledSource` stdin entry exporting `AgentCalendar` + `ServiceReadCache`, same eight cases, no temp file, no references to aggregate files.
