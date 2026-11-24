# apps/app/src/runtime/crash-log.ts
- Lines: 113 | Role: Alpha binding of the shared privacy-bounded problem log; adds renderer-owned Cloud inference failure records and the browser `localStorage` copy. | Verdict: SIMPLIFY
- Importers: 4 product (`prototype/settings-adapter.ts`, `runtime/connection-ui.tsx`, `runtime/diagnostics-export.ts`, `runtime/error-boundary.tsx`). Text/path pins: `scripts/prepare-client-features.ts` (path), `test/client-feature-preparation.test.mjs`, `test/diagnostics-export.test.mjs` (imports `browserCrashLogKey`, sanitizers), `specs/quint/application/manifest.json`, `specs/quint/refinement/application/recovery-ui.mjs` (literal `'alpha.crash-log.v1'`), `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 21 | A7 | `export {CRASH_LOG_MAX_ENTRIES,CRASH_LOG_RETENTION_MS,errorClassOf}`: the first two have 0 references outside this file; `errorClassOf` is used by `error-boundary.tsx`. | Re-export only `errorClassOf` (or let error-boundary import it from upstream). | None |
| 2 | 31-33 | A7 | `export const INFERENCE_SCHEMA_KEYWORDS / INFERENCE_PARAMETERS / INFERENCE_TOOL_NAMES`: 0 references outside this file (confirms research P12). | Drop `export`; keep the arrays (they define the persisted allowlist). | None |
| 3 | 23 | A7 | `export type CrashSource`: 0 external references. | Inline into `CrashEntry` or un-export. | None |
| 4 | 27 | A7/D7 | `export const browserCrashLogKey`: only `test/diagnostics-export.test.mjs` imports it. | Un-export with that test (T3). Value stays (persisted). | Low |
| 5 | 70, 73, 76, 81 | B1/B2 | Four `try{…localStorage…}catch{return []/0/false}` wrappers; `localStorage` always exists in the WebView and dev browser. | Keep a single catch in `writeBrowser` for quota (documented best effort) and the outer catch in `recordRendererFailure` (contract "never throws"); delete the others. `JSON.parse` of our own key is the storage trust boundary: keep the sanitizer, drop the try. | Low: corrupt storage would now throw from `readCrashLog`; wrap `JSON.parse` once in `readBrowserDocument()` if owner wants corrupt-tolerant reads. |
| 6 | 37, 39, 59 | C3 | `member()` = `diagnostics-export.ts:129` `one()`; inline plain-object guards at 39, 59. | Shared `oneOf` / `isRecord` in `runtime/parse.ts`. | None |
| 7 | 41, 61, 73 | C3 | Same "safe-integer timestamp within retention window" predicate written three times with different upper bounds (`+60_000` vs `+CRASH_LOG_RETENTION_MS`). | One `recentTimestamp(at,now,skew)` helper; keep the two bounds explicit. | None |
| 8 | 100 | B2 | `result?.entries`, `result?.exitHistory` on the native `crashLog()` result typed by `CrashLogPort`. | Drop `?.` (native result is non-null by contract). | Low |
| 9 | 111 | D8 | 520-char `describeCrashEntry` inference branch with an inline label map. | Hoist `const INFERENCE_LABELS={schemaDepth:'Depth',…}` and build the parts list over 4 lines. Copy unchanged. | None |
| 10 | 14-20 | A8 | Doc comment is accurate; keep but shorten to two lines. | Trim. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `member` | helper | 37 | `diagnostics-export.ts:129` `one` | `runtime/parse.ts` `oneOf` |
| `inferenceStages`, `inferenceReasons`, `INFERENCE_*` | const | 31-35 | no | stay (private) |
| `CloudInferenceFailure` | type | 36 | no (used by connection-ui) | stay |
| `readBrowser`/`writeBrowser`/`inferenceSeenAt` | helper | 69-77 | browser `localStorage` JSON envelope readers everywhere (C4) | stay |
| `browserCrashLogKey` | const | 27 | literal also in `specs/quint/refinement/application/recovery-ui.mjs:73` | `storage-keys.ts` registry if created (C6) |

## Proposed end state
Exports: `errorClassOf`, `RendererFailureKind`, `CrashEntry`, `CrashLog`, `CloudInferenceFailure`, `sanitizeCloudInferenceFailure`, `sanitizeCrashEntries`, `recordCloudInferenceFailure`, `recordRendererFailure`, `readCrashLog`, `clearCrashLog`, `describeCrashEntry`. Allowlist constants private, one storage-read helper, shared `oneOf`/`isRecord`/timestamp helper, readable `describeCrashEntry`. Stored format `{version:1,entries,inferenceSeenAt}` under `alpha.crash-log.v1` unchanged. ~95 lines.

## Verification
`test/diagnostics-export.test.mjs`, `test/browser/settings-device-facts.spec.ts`, `test/browser/settings-truth.production.spec.ts`, `test/browser/render-error-recovery.spec.ts`, Quint `recovery-ui.mjs`; Android `SettingsCrashLogInstrumentedTest` exercises the native side only.
