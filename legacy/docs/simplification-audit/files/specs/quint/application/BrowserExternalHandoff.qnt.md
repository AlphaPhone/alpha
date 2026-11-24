# specs/quint/application/BrowserExternalHandoff.qnt
- Lines: 125 | Kind: Quint model (live, `application/manifest.json`, 11 runs) | Verdict: KEEP model; PORT harness
- Covers: "Open in another browser" admits the external launch only at the final presentation boundary (same visit, same selected tab, same settled revision, not hidden/left/locked/disposed; private tabs need an approved review). Duplicates: none at model level. Callers/importers: manifest; harness `specs/quint/refinement/application/browser-external-handoff.mjs` (61 lines) via fixture `test/fixtures/browser-external-handoff.mjs` (157 lines); run by **both** `test/browser-external-handoff-refinement.test.mjs` and the aggregate `test/quint-application-refinement.test.mjs` (index.mjs:50). Playwright `test/browser/browser-external-handoff.spec.ts` and Android `BrowserExternalHandoffInstrumentedTest.java` cover the same journey end to end.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness | T10 | Fixture loads `apps/app/src/prototype/browser-external-handoff.ts` and the shared `tab-host.ts` through `sourceContext` (support.mjs:43): strips types, deletes every `import`/`export` line by regex and `vm`-evaluates the text with hand-supplied globals. `createExternalBrowserHandoff` is already exported, `BrowserTabSession` is exported upstream. | Import both with `bundledSource`/`loadBundled` (esbuild) and stub only `document`. No product change needed. | Low |
| 2 | fixture 32-40 | B5 | Fixture re-hashes the prepared `.eliza` tab host against `.source.json` and `upstream.lock.json` before each replay. `upstream:prepare-client` already guarantees this. | Delete the stamp/hash block. | Low |
| 3 | wrappers | T4 | Same campaign runs in the per-model test and in the application aggregate. | Keep the per-model wrapper; drop it from the aggregate (cross-file action for `index.mjs`). | None |
| 4 | 82, 87-90 | — | `dispose`, `lock`, `navigate` and `s' = s` stutter are all used by runs or step; nothing dead. | None | — |

## Proposed end state
Model unchanged. Harness imports the real `createExternalBrowserHandoff` and `BrowserTabSession` instead of `sourceContext`; fixture loses the hash ceremony (~20 lines). One test entry point (per-model wrapper). Manifest `sources` keep the three paths; `vendor/eliza/.../tab-host.ts` stays as a shared source.
