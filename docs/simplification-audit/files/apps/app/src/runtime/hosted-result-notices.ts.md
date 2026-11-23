# apps/app/src/runtime/hosted-result-notices.ts
- Lines: 42 | Role: typed port for the `AlphaHostedResults` notice methods plus `publishHostedResult` (post a notice for a new digest result) and `resolveHostedResultTap` (verify a tapped notice against the current binding and retained history). | Verdict: SIMPLIFY
- Importers: 3 (`browser/hosted-results.ts`, `runtime/hosted-digest-ui.tsx`, `runtime/hosted-notice-question.ts` type-only). Text/path pins: `specs/quint/application/manifest.json:3004`, `specs/quint/services/manifest.json:674`, `specs/quint/refinement/application/browser-hosted-result-notice.mjs:11`, `test/browser/dev-hosted-results.spec.ts:6,10`, `test/quint-native-hosted-result-notices.test.mjs`, `test/support/feature-parity.mjs:528`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-19 | C2 | `HostedResultNative` + `registerPlugin<HostedResultNative>('AlphaHostedResults')` is one of four typings of the same plugin (`hosted-digest-ui.tsx:71` `nativeSources`, `hosted-background.ts:13` `NativeInbox`, `prototype/workflow-adapter.ts:266` `ApprovalNoticeNative`). | Create `runtime/hosted-results-plugin.ts` with one interface (all 27 `@PluginMethod`s of `AlphaHostedResultsPlugin.java` that the renderer calls) and one proxy; this file imports it. | Low. |
| 2 | 8, 11, 13 | B2 | `releaseResultQuestion?`, `withdrawResult?`, `setResultsShowing?` optional although `AlphaHostedResultsPlugin.java` implements all three. Optionality only reflects that `browser/hosted-results.ts` (web impl) omits them. | Make them required; give the browser impl no-op implementations (it is dev-only) instead of making product callers guard. | Low. |
| 3 | 14 | A7 | `status()` declares `backgroundStatus?` and `lastSuccess?`; no renderer reader (grep `backgroundStatus\|lastSuccess` in apps/app/src: only this line). | Drop the two fields from the type. | None (type only). |
| 4 | 27, 29, 37, 39 | C3 / P3-research | `signal.throwIfAborted();if(!binding.current())throw new Error('Hosted account changed')` four times. | Local `const fence=()=>{signal.throwIfAborted();if(!binding.current())throw Error('Hosted account changed');}`. | None. |
| 5 | 30 | B3 | `if(!['posted','opened','denied','uncertain'].includes(resultState.phase))throw new Error('Notice outcome unknown')` validates the native plugin's own typed answer. Native bridge is a trust boundary per REVIEW-BRIEF, so this check is allowed. | Keep, but type `phase` as the union so callers need no re-check. | — |
| 6 | 34 | C1 | Return type written inline; hosted-notice-question.ts re-derives it as `Awaited<ReturnType<typeof resolveHostedResultTap>>`. | `export type HostedResultTap = …` and use it in both files. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `HostedResultRoute` | interface | 4 | Java `HostedNoticePoster` route fields; `browser/hosted-results.ts` | stays (or plugin module) |
| `HostedResultNative` | interface | 5-18 | `hosted-digest-ui.tsx:71`, `hosted-background.ts` `NativeInbox`, `prototype/workflow-adapter.ts` `ApprovalNoticeNative` | `runtime/hosted-results-plugin.ts` |
| `HostedResultBinding` | interface | 20-25 | — | stays |
| tap result union | type | 34 | `hosted-notice-question.ts:7` `Result` | export `HostedResultTap` here |

## Proposed end state
~35 lines: imports the shared plugin interface/proxy, exports `HostedResultBinding`, `HostedResultTap`, `publishHostedResult`, `resolveHostedResultTap` with one local `fence()`. Required (non-optional) native methods; unused status fields removed.

## Verification
Quint `NativeHostedResultNotices` / `BrowserHostedResultNotice` models and refinement harness; `test/browser/dev-hosted-results.spec.ts`; Android `HostedResultNoticeInstrumentedTest`, `HostedResultsLifecycleInstrumentedTest`; `npm run android:build:local`.
