# scripts/fixtures/bundled-module.ts
- Lines: 41 | Kind: test support (esbuild-bundles a real renderer module into a data: URL, with named module replacements; global installer) | Verdict: MOVE to `test/support/bundle-module.ts` and MERGE `scripts/fixtures/local-agent-stream.ts` into it
- Covers: lets Node tests import renderer modules that Node cannot load directly. Duplicates: `scripts/fixtures/local-agent-stream.ts` (same esbuild-to-data-URL loader, specialised to one entry), the esbuild bundles inlined in `test/inbox.test.mjs` and `test/calendar-managed-rejection.test.mjs:79`. Callers/importers: `scripts/test-mail-html.ts`, `scripts/test-inbox-saved-drafts.ts`, `scripts/test-inbox-multiple-drafts.ts` (all run as child suites from `test/mail-html.test.mjs` and `test/inbox.test.mjs`). Grep of the repo for `fixtures/bundled-module` finds nothing else.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-26 | C5 | Second copy of the "bundle with esbuild, import from a base64 data URL" loader; `fixtures/local-agent-stream.ts:9-19` does the same for one entry. | One `bundleModule(entry, {mocks, resolveDir})` in `test/support/`; local-agent-stream becomes a call to it. | L |
| 2 | 14-17 | T3 | The replacement plugin matches an import by full specifier **or by basename** (`path.split('/').at(-1)`): any import whose last path segment equals a mock key is silently replaced. `test-inbox-multiple-drafts.ts` uses this to stub the prototype dependencies of `inbox-drafts.ts`, which makes that test a stubbed unit test. | Match full specifiers only. Callers that need stubs are unit tests (T3); the surviving integration callers (`test-mail-html`, `test-inbox-saved-drafts`) pass none. | L |
| 3 | 28-41 | — | `installFixtureGlobals` (define/restore globals) is fine and has no twin in `scripts/`. | Keep with the move. | L |
| 4 | file | T9 | A test helper living under `scripts/`. | Move to `test/support/` with its importers (RECOMMENDATIONS stage E). | L |

## Proposed end state
`test/support/bundle-module.ts` (about 35 lines) exports `bundleModule(entry, options)` and `installFixtureGlobals`. It replaces this file and
`scripts/fixtures/local-agent-stream.ts`. Basename matching is removed. If `test-inbox-multiple-drafts` is deleted as a stubbed unit test (it
replaces every prototype dependency of `inbox-drafts.ts`), the `mocks` option has no caller left and should go too. Mail HTML sanitising and
saved-draft storage keep their real-module integration coverage.
