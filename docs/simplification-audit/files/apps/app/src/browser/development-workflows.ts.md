# apps/app/src/browser/development-workflows.ts
- Lines: 82 | Role: dev-only fake of the agent workflow HTTP protocol (/api/workflow/*) for the development connection | Verdict: MOVE to apps/app/src/dev/development-workflows.ts (or DELETE with the dev simulator)
- Importers: 1 (browser/development-connection.ts). Text/path pins: test/workflow-reminder-midnight.test.mjs (reads/slices source, T2), test/browser/dev-workflow-execution.spec.ts, test/browser/execution-storage-migration.spec.ts; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 18 | D5/B4 | `if(!devSurfacesEnabled)throw Error(...)` inside a module only reachable from the dev connection, which is already gated. | Delete the guard once dev code sits behind one dynamic import (P1 treatment). | Low; bundle audit is backstop. |
| 2 | 20 | C3/C6 | `JSON.parse(localStorage.getItem('alpha.connection.selection.v1')\|\|'null')` inline; same literal parse in digest-storage.ts:12,19 and ~14 other sites. | Call a `readConnectionSelection()` exported by the connection owner (runtime/connection-ui.tsx SELECTION). | Low. |
| 3 | 20-23 | B3 (P6) | `check()` (abort + identity verify + selection compare) runs before and after every editor call and inside each editor (lines 22, 43, 55, 57, 65, 79): check-act-check on a dev fixture. | Keep one `check()` at request entry and one inside `editState`; drop the in-editor repeats. | Low (dev only). Spec dev-workflow-execution asserts "Workflow connection changed" refusal; keep the entry check. |
| 4 | 58, 64, 77 | C3 | UUID-v4 regex `/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/` written three times (twin: runtime/device-view-profile.ts). | One `isUuidV4()` in apps/app/src/lib/ids.ts. | None. |
| 5 | 19-82 | D8/D9 | One 63-line function with 15 regex route branches, minified lines up to ~1,000 chars. | Split into a route table `{pattern, method, handler}`; one handler per route. | Medium; test/workflow-reminder-midnight.test.mjs slices this file by text and must be rewritten or deleted (T2). |
| 6 | 12-14 | C1 | Local `Workflow`, `Run`, `State` types; `receipt:Record<string,any>`. | Keep (dev-only shapes), but type receipt as the runtime receipt types. | None. |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| Workflow/Run/State | type | 12-14 | none (dev-only) | stay |
| publicWorkflow | helper | 15 | none | stay |
| catalog | const | 16 | runtime/phone-workflow-authoring catalog shape | stay |
| UUID-v4 regex | const | 58,64,77 | runtime/device-view-profile.ts | apps/app/src/lib/ids.ts |

## Proposed end state
Moves under dev/. Guard at 18 deleted; three UUID regexes replaced by `isUuidV4`; selection parse via shared reader; check-act-check reduced to entry + in-transaction. Route table replaces the if-chain. Owner decision (research §7 Q3): the whole development simulator may be deleted; if kept, move to apps/app/src/dev/. Estimated lines after: 70 (current 82).

## Verification
test/browser/dev-workflow-execution.spec.ts, execution-storage-migration.spec.ts, test/workflow-reminder-midnight.test.mjs (source-slicing; rewrite against an import). Run with ELIZA_DEV_ALLOW_TEST_MOCKS=1.
