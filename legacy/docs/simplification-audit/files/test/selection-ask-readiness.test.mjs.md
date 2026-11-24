# test/selection-ask-readiness.test.mjs
- Lines: 117 | Kind: transplant (esbuild-bundles `apps/app/src/prototype/selection-adapter.ts` with 10 imports replaced by inline stub modules, evaluated with `new Function` and fake `window`/`document`) | Verdict: REWRITE as `journeys/files.spec.ts` cases
- Covers: Files selected-document preview: Ask stays disabled until non-blank text (or an image/rendered PDF page) is read, and a stale read, view change, hidden page or closed preview retires the admitted review and its source verification. Duplicates: `test/browser/selected-document-accessibility.spec.ts` drives the same preview (layout/a11y); `specs/quint/refinement/application/files-recent-index.mjs` reads the same adapter text. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-24 | T2 | Ten import specifiers (including two deep `.eliza/client-features` paths) are rewritten to stub strings; any added import or rename of one breaks the bundle. | Delete. | Low |
| 2 | 25-46 | T3/T7 | Hand-built shell `api`, `Component`, `views` and a native `DailyApps` port: a unit test of the adapter on a fake shell. | Delete. | Low |
| 3 | 49-117 | T2 | Five tests; worth carrying: Ask disabled while the read is pending and enabled after; blank/binary/failed read keeps Ask disabled; closing the preview while a read is pending shows nothing. | Carry those three to the Files journey. | Med: fencing cases (identity/visibility retirement, source re-check after retain) are not otherwise covered |

## Proposed end state
File deleted. `journeys/files.spec.ts` (test-mocks build, dev Files fixture) gains three cases: select a text file and wait for Ask to enable;
select an empty file and see Ask stay disabled; open a slow file (fixture with a held read) and leave before it finishes, then assert no review dialog.
Needs the shared native-plugin fake for `DailyApps.readSelected` with a controllable deferred result.
