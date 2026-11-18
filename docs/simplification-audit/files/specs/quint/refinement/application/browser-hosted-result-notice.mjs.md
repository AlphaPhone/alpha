# specs/quint/refinement/application/browser-hosted-result-notice.mjs
- Lines: 315 | Kind: Quint refinement harness, **source transplant** (`sourceContext` strips types, deletes imports and evals six files in a `vm` context) | Verdict: PORT
- Covers: browser double of `AlphaHostedResults` (scheduled-digest notices): binding retirement, exact retained digest, shade revision/redaction, token settlement against `BrowserHostedResultNotice.qnt`. Duplicates: run by `test/quint-browser-hosted-result-notice.test.mjs` and the aggregate `index.mjs:81,119` (T4). Native twin: `refinement/native/hosted-result-notices.mjs`. Callers/importers: those two.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-11, 60-62 | T2 / T10 | `sourceContext(sources, ['browserHostedResults','hostedResultsDocument','resolveHostedResultTap','canonical'], globals)` concatenates `browser/domain-document.ts`, `revision.ts`, `screen-locked.ts`, `notice-action.ts`, `hosted-results.ts`, `runtime/hosted-result-notices.ts`, regex-deletes every `import`/`export` line and evals. Relies on: no top-level name collisions across six files, imports being single statements ending in `;`, and the injected globals `WebPlugin`, `browserDocuments`, `registerPlugin`. Any formatter run or import change breaks it. | Port to `bundledSource('apps/app/src/browser/hosted-results.ts', …)` with esbuild stubs for `./documents` (in-memory `browserDocuments`), `@capacitor/core` (`WebPlugin`) and `../platform-plugins` (`registerPlugin`), as `test/fixtures/browser-daily-stores.mjs` already does. Import `resolveHostedResultTap` from `runtime/hosted-result-notices.ts` the same way. Install jsdom globals with `installDocument()` from `browser-model-traces.mjs`. | M |
| 2 | 66 | D7 | Needs the private `canonical` from `hosted-results.ts:16` to classify digests. | Export one canonical-JSON helper from `apps/app/src/lib/json.ts` (C3 "canonical JSON") and use it in both product and harness; no test-only export. | L |
| 3 | 14 | C3 | Local SHA-256 hex helper. | Use the shared hash helper (`scripts/lib` / `refinement/support.mjs`). | L |
| 4 | 97-99 | — | Asserts `status.backgroundStatus`; delete-candidates B298 marks `backgroundStatus?` on the native interface as unread. The browser double does return it, so B298 must not remove it from `hosted-results.ts` without updating model observation `s.polling`. | Cross-check before applying B298. | M |
| 5 | 249, 306 | B5 | `captureSources` / `boundInputs` hash ceremony. | Follow the shared receipt decision. | L |

## Proposed end state
- Same ten scenarios, driven against a bundled real `hosted-results.ts` with three port stubs; no `sourceContext`.
- `canonical` comes from a shared product helper.
- Run only from its per-model test.
- `sourceContext` in `support.mjs` loses one caller (track: when no caller remains, delete it).
