# apps/app/src/browser/files.ts
- Lines: 108 | Role: web AlphaFiles plugin: upstream createBrowserFiles plus Photos-library bridging for storage* methods | Verdict: SIMPLIFY
- Importers: 3 (daily.ts, mail-attachments.ts, register.ts). Text/path pins: specs/quint/application/manifest.json, specs/quint/native/manifest.json, refinement browser-files-trash.mjs/files-*.mjs, test/browser/dev-files.spec.ts etc. (note: test/files-browser.test.mjs and several others reference upstream plugin-files/src/browser/files*.ts, not this file); test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 31 | A8 | Comment `// Files browser (PLAN section 4)` — PLAN.md does not exist (ls: no such file). | Delete the reference. | None. |
| 2 | 32 | B2/C1 | `new BrowserStorageVolume(this as any,...)`. | Type the constructor argument to the upstream expected interface. | Low. |
| 3 | 55, 78 | C3 | Reviewed-identity check `input.reviewed.length!==rows.length\|\|rows.some((row,i)=>input.reviewed![i]!==JSON.stringify([row.path,row.revision]))` duplicated. | Private `assertReviewed(input,rows)`. | None. |
| 4 | 29-30 | C3 | `/^[a-f0-9-]{36}$/` uuid regex. | lib/ids.ts. | None. |
| 5 | 42, 47, 82, 87 | B3 | `Array.isArray(result.entries)?result.entries:[]` defensive merges on our own upstream volume results. | Trust the typed volume result. | Low. |
| 6 | 25, 102 | C3 | `decodeURIComponent(path.split('/').slice(2).join('/'))` inlined again at 102 although `mediaId()` exists. | Use `this.mediaId(input.path)`. | None. |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| photoRows / mediaId / photoPath | helper | 19-25 | none | stay |

## Proposed end state
Same plugin minus the PLAN reference, with assertReviewed + mediaId reuse and no defensive array guards. Estimated lines after: 100 (current 108).

## Verification
test/browser/dev-files.spec.ts, files-bulk.spec.ts, selected-document-accessibility.spec.ts, Quint files-* refinement harnesses.
