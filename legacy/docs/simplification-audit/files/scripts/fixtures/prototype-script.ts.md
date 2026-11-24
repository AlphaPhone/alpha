# scripts/fixtures/prototype-script.ts
- Lines: 12 | Kind: source-transplant machinery (T2) | Verdict: DELETE with its importers
- Covers: turns a prototype module into a script string for `vm`: reads `apps/app/src/prototype/<file>` as text, strips `import` lines and `export` keywords by regex, strips TypeScript types, and appends `globalThis.<name>=<name>` bindings. Duplicates: `scripts/fixtures/calendar-adapter.ts:62-64` (same strip) and the transplant loaders in `test/` (research/tests-host.md group C, 268 files). Callers/importers: `scripts/inbox-adapter-fixture.ts`, `scripts/test-inbox-sent-cleanup.ts`, `scripts/test-inbox-grant-withdrawal.ts`, `scripts/test-clock-handoff-flow.ts`, `scripts/test-maps-reroute-freshness.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-11 | T2 | Executes product code with its imports removed; the dependencies come from whatever globals the caller supplies (`inbox-adapter-fixture.ts:231-247` supplies about 60). The test never runs the module graph the app runs. | Delete. | L |
| 2 | 8 | T10 | Export stripping only recognises `export (async )?function|const|let|interface|type`; `export class`, `export default` and multi-line imports break silently. | Goes with the file. | L |
| 3 | 2 | T9 | `scripts/` importing `test/support/strip-types.mjs`. | Goes with the file. | L |

## Proposed end state
Deleted. The behaviours its importers check (Inbox attention, sent-message cleanup, grant withdrawal, clock hand-off, Maps reroute freshness)
move to journeys (`journeys/inbox.spec.ts`, `journeys/maps.spec.ts`, `journeys/workflows.spec.ts`) or to integration tests that `import`
the prototype modules (they are ordinary ES modules; the adapters need a `Shell` class and a `views` object, both constructible in a test).
